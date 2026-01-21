"""RAGAS 기반 문제 품질 평가 모듈 (Refactored for Gemini) """

import json
import warnings
from datasets import Dataset
from ragas import evaluate
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.metrics import Faithfulness, AnswerRelevancy
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from config import config
from db import get_connection
from token_calculator import TokenUsage

# Deprecation 경고 무시
warnings.filterwarnings("ignore", category=DeprecationWarning)


def get_evaluator_llm():
    """평가용 Gemini LLM 초기화"""
    # Gemini-2.5-Flash (User requested)
    # 실제로는 Gemini 1.5 Flash 또는 최신 모델 매핑 필요.
    # config.GEMINI_MODEL에 "gemini-2.5-flash" 또는 유효한 모델명이 있어야 함.
    langchain_llm = ChatGoogleGenerativeAI(
        model=config.GEMINI_MODEL,  # e.g., "gemini-1.5-flash"
        google_api_key=config.GEMINI_API_KEY,
        temperature=0.0, # 평가는 Deterministic하게
    )
    return LangchainLLMWrapper(langchain_llm)


def get_evaluator_embeddings():
    """평가용 Gemini 임베딩 모델 초기화"""
    langchain_embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=config.GEMINI_API_KEY,
    )
    return LangchainEmbeddingsWrapper(langchain_embeddings)


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
    """생성된 문제를 RAGAS 평가용 데이터셋으로 변환"""
    data = {
        "user_input": [],
        "response": [],
        "retrieved_contexts": [],
    }

    for q in questions:
        chunk_contents = get_chunk_contents(q.get("chunk_ids", []))
        if not chunk_contents:
            continue

        data["user_input"].append(q["question"])
        data["response"].append(q.get("explanation", ""))
        data["retrieved_contexts"].append(chunk_contents)

    return Dataset.from_dict(data)


def evaluate_questions(questions: list[dict]) -> tuple[dict, TokenUsage]:
    """문제 품질 평가 실행"""
    print("=== RAGAS 평가 시작 (Gemini) ===\n")

    # 1. 모델 설정
    print(f"1. 평가 모델 초기화 중... (Model: {config.GEMINI_MODEL})")
    evaluator_llm = get_evaluator_llm()
    evaluator_embeddings = get_evaluator_embeddings()

    # 2. 데이터셋 준비
    dataset = prepare_evaluation_dataset(questions)
    print(f"2. 평가 데이터셋 준비 완료 ({len(dataset)} items)")

    if len(dataset) == 0:
        print("[오류] 평가할 데이터가 없습니다.")
        return {}, TokenUsage()

    # 3. 메트릭 설정
    # RAGAS 최신 문법: 메트릭 인스턴스에 LLM/Embedding 주입
    faithfulness = Faithfulness(llm=evaluator_llm)
    answer_relevancy = AnswerRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings)

    metrics = [faithfulness, answer_relevancy]

    # 4. 평가 실행
    print("3. 평가 실행 중...")
    results = evaluate(
        dataset=dataset,
        metrics=metrics,
    )

    print("\n=== 평가 완료 ===")
    
    # 결과 미리보기
    df = results.to_pandas()
    print(df.head())

    # 토큰 사용량 (추정)
    usage = TokenUsage(
        input_tokens=0,
        output_tokens=0,
        input_cost=0,
        output_cost=0,
        total_cost=0,
    )

    return results, usage

def print_evaluation_report(results) -> None:
    """평가 결과 리포트 출력"""
    df = results.to_pandas()
    print("\n[RAGAS 평가 리포트]")
    
    if "faithfulness" in df.columns:
        print(f"- Faithfulness: {df['faithfulness'].mean():.4f}")
    if "answer_relevancy" in df.columns:
        print(f"- Answer Relevancy: {df['answer_relevancy'].mean():.4f}")


if __name__ == "__main__":
    # 테스트 실행
    try:
        with open("generation.json", "r", encoding="utf-8") as f:
            questions = json.load(f)
        results, _ = evaluate_questions(questions)
        print_evaluation_report(results)
    except Exception as e:
        print(f"테스트 실패: {e}")