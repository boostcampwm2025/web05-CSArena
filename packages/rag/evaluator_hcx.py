"""RAGAS 기반 문제 품질 평가 모듈 - HCX-007 버전"""

import json
import warnings

# Deprecation 경고 무시
warnings.filterwarnings("ignore", category=DeprecationWarning)

from datasets import Dataset
from langchain_naver import ChatClovaX, ClovaXEmbeddings
from ragas import evaluate, RunConfig
from ragas.metrics import faithfulness, answer_relevancy, context_precision

from config import config
from db import get_connection
from token_calculator import TokenUsage


def get_evaluator_llm():
    """평가용 LLM 초기화"""
    return ChatClovaX(
        model=config.LLM_MODEL,  # HCX-007 사용
        temperature=0.1,  # 평가 일관성을 위해 낮은 temperature
        max_tokens=2048,
    )


def get_evaluator_embeddings():
    """평가용 임베딩 모델 초기화"""
    return ClovaXEmbeddings(model=config.EMBEDDING_MODEL)


def get_chunk_contents(chunk_ids: list[int]) -> list[str]:
    """청크 ID로 청크 내용 조회"""
    if not chunk_ids:
        return []

    with get_connection() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["%s"] * len(chunk_ids))
        query = f"SELECT content FROM document_embeddings WHERE id IN ({placeholders})"
        cursor.execute(query, chunk_ids)
        results = cursor.fetchall()
        cursor.close()

    return [row[0] for row in results]


def prepare_evaluation_dataset(questions: list[dict]) -> Dataset:
    """생성된 문제를 RAGAS 평가용 데이터셋으로 변환

    Args:
        questions: 생성된 문제 리스트 (generation.json 형식)

    Returns:
        RAGAS 평가용 Dataset
    """
    data = {
        "user_input": [],
        "response": [],
        "retrieved_contexts": [],
        "reference": [],  # context_precision에 필요
    }

    for q in questions:
        # 청크 내용 조회
        chunk_contents = get_chunk_contents(q.get("chunk_ids", []))

        if not chunk_contents:
            print(f"[경고] 청크 내용 없음, 스킵: {q['question'][:50]}...")
            continue

        data["user_input"].append(q["question"])
        data["response"].append(q["answer"])
        data["retrieved_contexts"].append(chunk_contents)
        data["reference"].append(q["answer"])  # 정답을 reference로 사용

    return Dataset.from_dict(data)


def evaluate_questions(questions: list[dict]) -> dict:
    """문제 품질 평가 실행

    Args:
        questions: 생성된 문제 리스트

    Returns:
        평가 결과 딕셔너리
    """
    print("=== RAGAS 평가 시작 (HCX-007) ===\n")

    # 1. 모델 초기화
    print("1. 평가 모델 초기화 중...")
    evaluator_llm = get_evaluator_llm()
    evaluator_embeddings = get_evaluator_embeddings()

    # 2. 데이터셋 준비
    print("2. 평가 데이터셋 준비 중...")
    dataset = prepare_evaluation_dataset(questions)
    print(f"   → {len(dataset)}개 문제 평가 대상")

    if len(dataset) == 0:
        print("[오류] 평가할 문제가 없습니다.")
        return {}

    # 3. 메트릭에 LLM/Embeddings 설정
    faithfulness.llm = evaluator_llm
    answer_relevancy.llm = evaluator_llm
    answer_relevancy.embeddings = evaluator_embeddings
    context_precision.llm = evaluator_llm

    # 4. 평가 실행 (Rate Limit 방지를 위한 설정)
    print("3. 평가 실행 중... (동시성 제한: 2)")

    # RunConfig로 동시 요청 수 제한 (QPM 180 = 초당 3개, 여유있게 2로 설정)
    run_config = RunConfig(
        max_workers=2,      # 동시 실행 워커 수 제한
        max_wait=180,       # 최대 대기 시간 (초)
        max_retries=3,      # 실패 시 재시도 횟수
    )

    results = evaluate(
        dataset=dataset,
        metrics=[
            faithfulness,        # 답안이 청크 기반인가
            answer_relevancy,    # 답안이 질문에 맞는가
            context_precision,   # 청크가 질문 해결에 적절한가
        ],
        run_config=run_config,
    )

    print("\n=== 평가 완료 ===")
    return results


def print_evaluation_report(results) -> None:
    """평가 결과 리포트 출력"""
    print("\n" + "=" * 60)
    print("RAGAS 평가 결과 리포트 (HCX-007)")
    print("=" * 60)

    # DataFrame으로 상세 결과
    df = results.to_pandas()

    # 전체 평균 점수
    print("\n[전체 평균 점수]")
    for col in ["faithfulness", "answer_relevancy", "context_precision"]:
        if col in df.columns:
            avg = df[col].mean()
            print(f"  - {col}: {avg:.4f}")

    print("\n[문제별 상세 점수]")
    print(df.to_string())

    # 저품질 문제 식별
    print("\n[저품질 문제 (점수 < 0.5)]")
    conditions = []
    for col in ["faithfulness", "answer_relevancy", "context_precision"]:
        if col in df.columns:
            conditions.append(df[col] < 0.5)

    if conditions:
        low_quality = df[conditions[0] | conditions[1] | conditions[2]] if len(conditions) == 3 else df[conditions[0]]
    else:
        low_quality = df.iloc[0:0]

    if len(low_quality) > 0:
        for idx, row in low_quality.iterrows():
            print(f"  문제 {idx}: {row['user_input'][:50]}...")
            for col in ["faithfulness", "answer_relevancy", "context_precision"]:
                if col in df.columns:
                    print(f"    - {col}: {row.get(col, 'N/A')}")
    else:
        print("  없음 (모든 문제가 기준 통과)")


if __name__ == "__main__":
    print("=== Evaluator HCX-007 검증 ===\n")

    # generation.json 로드
    try:
        with open("generation.json", "r", encoding="utf-8") as f:
            questions = json.load(f)
        print(f"로드된 문제 수: {len(questions)}")
    except FileNotFoundError:
        print("generation.json 파일이 없습니다. question_generator.py를 먼저 실행하세요.")
        exit(1)

    # 평가 실행
    results = evaluate_questions(questions)

    # 결과 출력
    if results:
        print_evaluation_report(results)

        # 결과 저장
        df = results.to_pandas()
        df.to_csv("evaluation_test2.csv", index=False, encoding="utf-8-sig")
        print("\n결과가 evaluation_test2.csv에 저장되었습니다.")
