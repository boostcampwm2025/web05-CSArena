"""문제 생성 파이프라인"""

import json
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass

from category_loader import get_leaf_category_with_least_questions
from retriever import retrieve_chunks_with_reranker
from question_generator import generate_questions
from postprocessor import postprocess_questions
from evaluator import evaluate_questions
from config import config
from schemas import QuestionGenerationContext
from token_calculator import TokenUsage


# 품질 기준
FAITHFULNESS_THRESHOLD = 0.9
ANSWER_RELEVANCY_THRESHOLD = 0.7
MAX_ROUNDS = 10


@dataclass
class CostTracker:
    """비용 추적"""
    hyde: float = 0.0
    reranker: float = 0.0
    generation: float = 0.0
    postprocess: float = 0.0
    evaluation: float = 0.0

    @property
    def total(self) -> float:
        return self.hyde + self.reranker + self.generation + self.postprocess + self.evaluation

    def summary(self) -> str:
        return f"HyDE {self.hyde:.1f}원 + Reranker {self.reranker:.1f}원 + 생성 {self.generation:.1f}원 + 후처리 {self.postprocess:.1f}원 + 평가 {self.evaluation:.1f}원 = {self.total:.1f}원"


class Logger:
    """간결한 파이프라인 로거"""

    def __init__(self, log_file: str):
        self.log_file = log_file
        self.start_time = datetime.now()

    def log(self, message: str, indent: int = 0):
        """로그 메시지 기록"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = "  " * indent
        log_line = f"[{timestamp}] {prefix}{message}"

        print(log_line)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_line + '\n')

    def elapsed(self) -> str:
        """경과 시간 반환"""
        delta = datetime.now() - self.start_time
        minutes, seconds = divmod(int(delta.total_seconds()), 60)
        return f"{minutes}분 {seconds}초"


def get_output_directory() -> Path:
    """오늘 날짜 기준 출력 디렉토리 생성"""
    today = datetime.now().strftime("%Y-%m-%d")
    output_dir = Path("output") / today
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def evaluate_and_classify(
    questions: list[dict],
) -> tuple[list[dict], list[dict], TokenUsage]:
    """문제 평가 후 합격/탈락 분류

    Returns:
        (합격 문제 리스트, 탈락 문제 리스트, 토큰 사용량)
    """
    results, usage = evaluate_questions(questions)
    df = results.to_pandas()

    passed = []
    rejected = []

    for q, row in zip(questions, df.itertuples()):
        faithfulness = row.faithfulness
        answer_relevancy = row.answer_relevancy

        q_with_scores = q.copy()
        q_with_scores['scores'] = {
            'faithfulness': float(faithfulness),
            'answer_relevancy': float(answer_relevancy)
        }

        if faithfulness >= FAITHFULNESS_THRESHOLD and answer_relevancy >= ANSWER_RELEVANCY_THRESHOLD:
            passed.append(q_with_scores)
        else:
            q_with_scores['rejected_at'] = datetime.now().isoformat()
            rejected.append(q_with_scores)

    return passed, rejected, usage


def run_pipeline():
    """메인 파이프라인 실행"""
    output_dir = get_output_directory()
    log_file = output_dir / "pipeline.log"
    passed_file = output_dir / "passed_questions.json"
    rejected_file = output_dir / "rejected_questions.json"

    logger = Logger(str(log_file))
    cost = CostTracker()

    logger.log(f"파이프라인 시작 (목표: {config.TARGET_QUESTIONS}개)")

    # 기존 결과 로드
    all_passed = []
    all_rejected = []

    if passed_file.exists():
        with open(passed_file, 'r', encoding='utf-8') as f:
            all_passed = json.load(f)
        if all_passed:
            logger.log(f"기존 결과 로드: {len(all_passed)}개")

    if len(all_passed) >= config.TARGET_QUESTIONS:
        logger.log(f"이미 목표 달성 ({len(all_passed)}/{config.TARGET_QUESTIONS})")
        return

    # 메인 루프
    tried_categories = set()
    round_num = 1

    while len(all_passed) < config.TARGET_QUESTIONS and round_num <= MAX_ROUNDS:
        # 1. 카테고리 선택
        try:
            category = get_leaf_category_with_least_questions()
            if not category or category.id in tried_categories:
                round_num += 1
                continue
            tried_categories.add(category.id)
        except Exception as e:
            logger.log(f"카테고리 선택 실패: {e}")
            round_num += 1
            continue

        logger.log(f"Round {round_num}: {category.name} (ID:{category.id})")

        # 2. 청크 검색 + Reranker
        try:
            retrieval = retrieve_chunks_with_reranker(category, top_k=10)
            if not retrieval.chunks or retrieval.question_count == 0:
                logger.log(f"관련 청크 없음 (스킵)", indent=1)
                round_num += 1
                continue
            cost.hyde += retrieval.hyde_usage.total_cost
            cost.reranker += retrieval.reranker_usage.total_cost
            retrieval_cost = retrieval.hyde_usage.total_cost + retrieval.reranker_usage.total_cost
            logger.log(f"청크 검색: {len(retrieval.chunks)}개, 목표 문제: {retrieval.question_count}개 ({retrieval_cost:.1f}원)", indent=1)
        except Exception as e:
            logger.log(f"청크 검색 실패: {e}", indent=1)
            round_num += 1
            continue

        # 3. 문제 생성
        context = QuestionGenerationContext(
            category_id=category.id,
            category_name=category.name,
            category_path=category.path,
            chunks=[c.content for c in retrieval.chunks],
            chunk_ids=[c.id for c in retrieval.chunks],
            target_question_count=retrieval.question_count,
        )

        try:
            questions, gen_usage = generate_questions(context)
            if not questions:
                round_num += 1
                continue
            cost.generation += gen_usage.total_cost
            logger.log(f"문제 생성: {len(questions)}개 ({gen_usage.total_cost:.1f}원)", indent=1)
        except Exception as e:
            logger.log(f"문제 생성 실패: {e}", indent=1)
            round_num += 1
            continue

        # 4. 해설 후처리
        questions_dict = [q.to_dict() for q in questions]
        try:
            questions_dict, pp_usage = postprocess_questions(questions_dict)
            cost.postprocess += pp_usage.total_cost
            logger.log(f"후처리: {len(questions_dict)}개 ({pp_usage.total_cost:.1f}원)", indent=1)
        except Exception as e:
            logger.log(f"후처리 실패 (원본 유지): {e}", indent=1)

        # 5. 평가
        try:
            passed, rejected, eval_usage = evaluate_and_classify(
                questions_dict
            )
            cost.evaluation += eval_usage.total_cost
            logger.log(f"평가: 합격 {len(passed)}개, 탈락 {len(rejected)}개 ({eval_usage.total_cost:.1f}원)", indent=1)
        except Exception as e:
            logger.log(f"평가 실패: {e}", indent=1)
            round_num += 1
            continue

        # 6. 결과 누적
        all_passed.extend(passed)
        all_rejected.extend(rejected)

        logger.log(f"누적: {len(all_passed)}/{config.TARGET_QUESTIONS}", indent=1)

        # 7. 중간 저장
        with open(passed_file, 'w', encoding='utf-8') as f:
            json.dump(all_passed, f, ensure_ascii=False, indent=2)
        with open(rejected_file, 'w', encoding='utf-8') as f:
            json.dump(all_rejected, f, ensure_ascii=False, indent=2)

        if len(all_passed) >= config.TARGET_QUESTIONS:
            break

        round_num += 1

    # 최종 저장
    with open(passed_file, 'w', encoding='utf-8') as f:
        json.dump(all_passed, f, ensure_ascii=False, indent=2)
    with open(rejected_file, 'w', encoding='utf-8') as f:
        json.dump(all_rejected, f, ensure_ascii=False, indent=2)

    # 최종 리포트
    logger.log("완료")
    logger.log(f"결과: 합격 {len(all_passed)}개, 탈락 {len(all_rejected)}개", indent=1)

    if all_passed:
        avg_faith = sum(q['scores']['faithfulness'] for q in all_passed) / len(all_passed)
        avg_relevancy = sum(q['scores']['answer_relevancy'] for q in all_passed) / len(all_passed)
        logger.log(f"평균: Faithfulness {avg_faith:.2f}, Relevancy {avg_relevancy:.2f}", indent=1)

    logger.log(f"비용: {cost.summary()}", indent=1)
    logger.log(f"소요시간: {logger.elapsed()}", indent=1)


if __name__ == "__main__":
    try:
        run_pipeline()
    except KeyboardInterrupt:
        print("\n\n사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n\n오류 발생: {e}")
        import traceback
        traceback.print_exc()
