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
from token_calculator import (
    TokenUsage,
    get_token_usage_for_gemini,
    get_usd_to_krw_rate,
    GEMINI_2_0_FLASH_INPUT_COST_PER_TOKEN,
    GEMINI_2_0_FLASH_OUTPUT_COST_PER_TOKEN,
)

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
        model="models/gemini-embedding-001",
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


def evaluate_questions(questions: list[dict], verbose: bool = False) -> tuple[dict, TokenUsage]:
    """문제 품질 평가 실행

    Args:
        questions: 평가할 문제 리스트
        verbose: 상세 로그 출력 여부

    Returns:
        (평가 결과, 토큰 사용량)
    """
    # 1. 모델 설정
    evaluator_llm = get_evaluator_llm()
    evaluator_embeddings = get_evaluator_embeddings()

    # 2. 데이터셋 준비
    dataset = prepare_evaluation_dataset(questions)

    if len(dataset) == 0:
        return {}, TokenUsage()

    # 3. 메트릭 설정
    faithfulness = Faithfulness(llm=evaluator_llm)
    answer_relevancy = AnswerRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings)

    # 4. 평가 실행 (토큰 추적 포함)
    results = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy],
        token_usage_parser=get_token_usage_for_gemini,
    )

    # 5. 비용 계산
    try:
        cost_usd = results.total_cost(
            cost_per_input_token=GEMINI_2_0_FLASH_INPUT_COST_PER_TOKEN,
            cost_per_output_token=GEMINI_2_0_FLASH_OUTPUT_COST_PER_TOKEN,
        )
        tokens = results.total_tokens()
        rate = get_usd_to_krw_rate()
        cost_krw = cost_usd * rate

        usage = TokenUsage(
            input_tokens=tokens.input_tokens,
            output_tokens=tokens.output_tokens,
            input_cost=tokens.input_tokens * GEMINI_2_0_FLASH_INPUT_COST_PER_TOKEN * rate,
            output_cost=tokens.output_tokens * GEMINI_2_0_FLASH_OUTPUT_COST_PER_TOKEN * rate,
            total_cost=cost_krw,
        )
    except Exception:
        usage = TokenUsage()

    if verbose:
        df = results.to_pandas()
        print(df.head())

    return results, usage

def print_evaluation_report(results) -> None:
    """평가 결과 리포트 출력"""
    df = results.to_pandas()
    print("\n[RAGAS 평가 리포트]")

    if "faithfulness" in df.columns:
        print(f"- Faithfulness: {df['faithfulness'].mean():.4f}")
    if "answer_relevancy" in df.columns:
        print(f"- Answer Relevancy: {df['answer_relevancy'].mean():.4f}")
