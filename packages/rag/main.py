import json
import pandas as pd
from schemas import QuestionGenerationContext
from category_loader import get_leaf_category_with_least_questions
from retriever import retrieve_chunks
from question_generator import generate_questions
from evaluator import evaluate_questions, print_evaluation_report
from config import config
from token_calculator import TokenTracker

def main():
    print("=== [RAG 문제 생성 및 평가 파이프라인 시작] ===\n")

    # 토큰 추적기 초기화
    tracker = TokenTracker()

    # ---------------------------------------------------------
    # 1. 카테고리 선정 (Category Selection)
    # ---------------------------------------------------------
    print("1. 카테고리 선정 중...")
    category = get_leaf_category_with_least_questions()
    if not category:
        print("[오류] 카테고리를 찾을 수 없습니다.")
        return

    print(f"   - 선정된 카테고리: {category.name}")
    print(f"   - 경로: {category.path}")
    print(f"   - ID: {category.id}")

    # ---------------------------------------------------------
    # 2. 청크 검색 (Retrieval: HyDE + Vector)
    # ---------------------------------------------------------
    print("\n2. 청크 검색 중 (HyDE + Vector)...")
    chunks, hyde_usage = retrieve_chunks(category, top_k=config.TOP_K_CHUNKS)
    tracker.hyde_generation = hyde_usage

    if not chunks:
        print("[오류] 검색된 청크가 없습니다.")
        return

    print(f"   - {len(chunks)}개 청크 검색 완료")
    print(f"   - HyDE 비용: {hyde_usage.total_cost:.2f}원")

    # ---------------------------------------------------------
    # 3. 문제 생성 (Question Generation)
    # ---------------------------------------------------------
    print("\n3. LLM 문제 생성 중...")

    # 컨텍스트 구성
    context = QuestionGenerationContext(
        category_id=category.id,
        category_name=category.name,
        category_path=category.path,
        chunks=[c.content for c in chunks],
        chunk_ids=[c.id for c in chunks],
    )

    # 문제 생성 실행
    generated_questions, question_usage = generate_questions(context)
    tracker.question_generation = question_usage

    if not generated_questions:
        print("[오류] 생성된 문제가 없습니다.")
        return

    # Dict 변환 (평가 모듈 입력용)
    questions_dicts = [q.to_dict() for q in generated_questions]
    print(f"   - {len(questions_dicts)}개 문제 생성 완료")
    print(f"   - 문제 생성 비용: {question_usage.total_cost:.2f}원")

    # ---------------------------------------------------------
    # 4. RAGAS 평가 (Evaluation)
    # ---------------------------------------------------------
    print("\n4. RAGAS 품질 평가 실행 중...")

    # 평가 실행 (Result 객체 반환)
    ragas_results, eval_usage = evaluate_questions(questions_dicts)
    tracker.ragas_evaluation = eval_usage

    if not ragas_results:
        print("[오류] 평가 결과가 없습니다.")
        return

    # 리포트 출력
    print_evaluation_report(ragas_results)

    # ---------------------------------------------------------
    # 5. 결과 병합 및 저장 (Merge & Save)
    # ---------------------------------------------------------
    print("\n5. 최종 결과 병합 및 저장 중...")
    
    # DataFrame으로 변환
    df = ragas_results.to_pandas()
    
    final_data = []
    
    # 문제 데이터와 평가 점수 병합
    # (순서가 보장된다고 가정하되, 인덱스 매칭 수행)
    for idx, q_dict in enumerate(questions_dicts):
        # 기본값 설정
        metrics = {
            "faithfulness": None,
            "answer_relevancy": None,
            "context_precision": None
        }
        
        # DataFrame에서 점수 추출 (NaN 처리 포함)
        if idx < len(df):
            row = df.iloc[idx]
            
            # 안전한 float 변환 함수
            def safe_float(val):
                try:
                    return float(val) if pd.notnull(val) else None
                except:
                    return None

            metrics["faithfulness"] = safe_float(row.get("faithfulness"))
            metrics["answer_relevancy"] = safe_float(row.get("answer_relevancy"))
            metrics["context_precision"] = safe_float(row.get("context_precision"))
        
        # 기존 dict에 메트릭 추가 (확장)
        q_dict.update(metrics)
        final_data.append(q_dict)

    # result.json 저장
    output_file = "result.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)

    print(f"\n[완료] 총 {len(final_data)}개의 평가된 문제가 '{output_file}'에 저장되었습니다.")

    # ---------------------------------------------------------
    # 6. 전체 비용 리포트 출력
    # ---------------------------------------------------------
    tracker.print_report()

if __name__ == "__main__":
    main()
