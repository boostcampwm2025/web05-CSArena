"""
검색 전략 비교 실험
- 상황: 어떤 검색 방식이 RAG 파이프라인에 가장 적합한가?
- 옵션: HyDE + Vector, Category Direct + Vector, tsvector Only, Hybrid
- 테스트: 5개 지엽적 카테고리로 각 방식 비교
"""

import sys
import json
from datetime import datetime
from dataclasses import dataclass, asdict

sys.path.append("..")

from category_loader import CategoryInfo, get_category_path
from hyde_generator import generate_hyde_query
from retriever import get_query_embedding, retrieve_similar_chunks, retrieve_hybrid_chunks
from db import get_connection, get_cursor
from config import config
from langchain_naver import ChatClovaX
from langchain_core.messages import SystemMessage, HumanMessage


@dataclass
class ExperimentResult:
    method: str
    category_id: int
    category_name: str
    query_used: str
    chunks: list
    avg_similarity: float


# 테스트 카테고리 (지엽적 주제)
TEST_CATEGORIES = [
    {"id": 30, "name": "connection management"},
    {"id": 17, "name": "error detection"},
    {"id": 18, "name": "mac address"},
    {"id": 32, "name": "congestion control"},
    {"id": 42, "name": "http status code categories"},
]


def get_category_info(cat_id: int, cat_name: str) -> CategoryInfo:
    """카테고리 정보 조회"""
    path = get_category_path(cat_id)
    return CategoryInfo(id=cat_id, name=cat_name, path=path, question_count=0)


def method_hyde_vector(category: CategoryInfo) -> ExperimentResult:
    """방법 1: HyDE + Vector Search"""
    hyde_query = generate_hyde_query(category)
    embedding = get_query_embedding(hyde_query)
    chunks = retrieve_similar_chunks(embedding, config.TOP_K_CHUNKS)

    return ExperimentResult(
        method="HyDE + Vector",
        category_id=category.id,
        category_name=category.name,
        query_used=hyde_query[:200] + "...",
        chunks=[{"id": c.id, "similarity": c.similarity, "preview": c.content[:100]} for c in chunks],
        avg_similarity=sum(c.similarity for c in chunks) / len(chunks) if chunks else 0
    )


def method_category_direct_vector(category: CategoryInfo) -> ExperimentResult:
    """방법 2: 카테고리명 직접 임베딩 + Vector Search"""
    query = f"{category.name} {category.path}"
    embedding = get_query_embedding(query)
    chunks = retrieve_similar_chunks(embedding, config.TOP_K_CHUNKS)

    return ExperimentResult(
        method="Category Direct + Vector",
        category_id=category.id,
        category_name=category.name,
        query_used=query,
        chunks=[{"id": c.id, "similarity": c.similarity, "preview": c.content[:100]} for c in chunks],
        avg_similarity=sum(c.similarity for c in chunks) / len(chunks) if chunks else 0
    )


def method_tsvector_only(category: CategoryInfo) -> ExperimentResult:
    """방법 3: tsvector 키워드 검색만"""
    keyword = category.name

    query = """
    SELECT id, content, ts_rank(tsvector, plainto_tsquery('english', %s)) AS rank
    FROM document_embeddings
    WHERE tsvector @@ plainto_tsquery('english', %s)
    ORDER BY rank DESC
    LIMIT %s
    """

    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query, (keyword, keyword, config.TOP_K_CHUNKS))
            results = cursor.fetchall()

    chunks = [{"id": r["id"], "similarity": float(r["rank"]), "preview": r["content"][:100]} for r in results]

    return ExperimentResult(
        method="tsvector Only",
        category_id=category.id,
        category_name=category.name,
        query_used=keyword,
        chunks=chunks,
        avg_similarity=sum(c["similarity"] for c in chunks) / len(chunks) if chunks else 0
    )


def method_hybrid(category: CategoryInfo) -> ExperimentResult:
    """방법 4: Hybrid (Vector + Keyword)"""
    hyde_query = generate_hyde_query(category)
    embedding = get_query_embedding(hyde_query)
    keyword = category.name

    chunks = retrieve_hybrid_chunks(embedding, keyword, config.TOP_K_CHUNKS)

    return ExperimentResult(
        method="Hybrid (Vector + Keyword)",
        category_id=category.id,
        category_name=category.name,
        query_used=f"Vector: {hyde_query[:100]}... | Keyword: {keyword}",
        chunks=[{"id": c.id, "similarity": c.similarity, "preview": c.content[:100]} for c in chunks],
        avg_similarity=sum(c.similarity for c in chunks) / len(chunks) if chunks else 0
    )


def extract_keywords_from_hyde(hyde_query: str) -> str:
    """HyDE 쿼리에서 핵심 키워드 추출 (LLM 사용) - 기존 프롬프트"""
    llm = ChatClovaX(model=config.LLM_MODEL, temperature=0.1)

    system_prompt = """You are a keyword extraction expert.
Extract 3-5 core technical keywords from the given text.
Return only the keywords separated by spaces, nothing else.
Example output: TCP handshake connection SYN ACK"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=hyde_query),
    ]

    response = llm.invoke(messages)
    return response.content.strip()


def extract_keywords_from_hyde_v2(hyde_query: str) -> str:
    """HyDE 쿼리에서 핵심 키워드 추출 (LLM 사용) - 개선된 프롬프트"""
    llm = ChatClovaX(model=config.LLM_MODEL, temperature=0.1)

    system_prompt = """You are preparing search terms for a PostgreSQL full-text search (tsvector).

Extract 3-5 English technical terms that:
1. Would appear as-is in a networking textbook
2. Are searchable words (not numbers or abbreviations like "1xx")
3. Represent core concepts, not categories

Example:
Topic: "HTTP status code categories"
Good: HTTP response status redirect client-error
Bad: 1xx 2xx 3xx 4xx 5xx

Return only space-separated keywords."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=hyde_query),
    ]

    response = llm.invoke(messages)
    return response.content.strip()


def method_hybrid_with_hyde_keywords(category: CategoryInfo) -> ExperimentResult:
    """방법 5: Hybrid with HyDE-extracted Keywords (기존 프롬프트)"""
    hyde_query = generate_hyde_query(category)
    embedding = get_query_embedding(hyde_query)

    # HyDE 쿼리에서 키워드 추출
    extracted_keywords = extract_keywords_from_hyde(hyde_query)

    chunks = retrieve_hybrid_chunks(embedding, extracted_keywords, config.TOP_K_CHUNKS)

    return ExperimentResult(
        method="Hybrid (HyDE Keywords)",
        category_id=category.id,
        category_name=category.name,
        query_used=f"Vector: HyDE | Keywords: {extracted_keywords}",
        chunks=[{"id": c.id, "similarity": c.similarity, "preview": c.content[:100]} for c in chunks],
        avg_similarity=sum(c.similarity for c in chunks) / len(chunks) if chunks else 0
    )


def method_hybrid_with_hyde_keywords_v2(category: CategoryInfo) -> ExperimentResult:
    """방법 6: Hybrid with HyDE-extracted Keywords (개선된 프롬프트)"""
    hyde_query = generate_hyde_query(category)
    embedding = get_query_embedding(hyde_query)

    # HyDE 쿼리에서 키워드 추출 (개선된 프롬프트)
    extracted_keywords = extract_keywords_from_hyde_v2(hyde_query)

    chunks = retrieve_hybrid_chunks(embedding, extracted_keywords, config.TOP_K_CHUNKS)

    return ExperimentResult(
        method="Hybrid (HyDE Keywords v2)",
        category_id=category.id,
        category_name=category.name,
        query_used=f"Vector: HyDE | Keywords v2: {extracted_keywords}",
        chunks=[{"id": c.id, "similarity": c.similarity, "preview": c.content[:100]} for c in chunks],
        avg_similarity=sum(c.similarity for c in chunks) / len(chunks) if chunks else 0
    )


def method_keyword_filter_then_vector(category: CategoryInfo) -> ExperimentResult:
    """방법 5: 키워드 필터 후 Vector 정렬"""
    hyde_query = generate_hyde_query(category)
    embedding = get_query_embedding(hyde_query)
    keyword = category.name

    query = """
    SELECT id, content, embedding <=> %s::vector AS distance
    FROM document_embeddings
    WHERE tsvector @@ plainto_tsquery('english', %s)
    ORDER BY distance ASC
    LIMIT %s
    """

    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query, (embedding, keyword, config.TOP_K_CHUNKS))
            results = cursor.fetchall()

    chunks = [{"id": r["id"], "similarity": 1 - r["distance"], "preview": r["content"][:100]} for r in results]

    return ExperimentResult(
        method="Keyword Filter → Vector Sort",
        category_id=category.id,
        category_name=category.name,
        query_used=f"Filter: {keyword} | Vector: HyDE query",
        chunks=chunks,
        avg_similarity=sum(c["similarity"] for c in chunks) / len(chunks) if chunks else 0
    )


def run_experiment():
    """전체 실험 실행"""
    print("=" * 60)
    print("검색 전략 비교 실험")
    print("=" * 60)

    all_results = []

    for cat_info in TEST_CATEGORIES:
        category = get_category_info(cat_info["id"], cat_info["name"])
        print(f"\n\n{'#' * 60}")
        print(f"카테고리: {category.name}")
        print(f"경로: {category.path}")
        print("#" * 60)

        methods = [
            ("1. HyDE + Vector", method_hyde_vector),
            ("2. Category Direct + Vector", method_category_direct_vector),
            ("3. Hybrid (Category Name)", method_hybrid),
            ("4. Hybrid (HyDE Keywords)", method_hybrid_with_hyde_keywords),
            ("5. Hybrid (HyDE Keywords v2)", method_hybrid_with_hyde_keywords_v2),
        ]

        category_results = []

        for method_name, method_func in methods:
            print(f"\n--- {method_name} ---")
            try:
                result = method_func(category)
                category_results.append(result)

                print(f"평균 유사도: {result.avg_similarity:.4f}")
                print(f"검색된 청크 수: {len(result.chunks)}")
                for i, chunk in enumerate(result.chunks[:3], 1):
                    print(f"  [{i}] ID:{chunk['id']}, 유사도:{chunk['similarity']:.4f}")
                    print(f"      {chunk['preview'][:60]}...")

            except Exception as e:
                print(f"  오류 발생: {e}")
                category_results.append(ExperimentResult(
                    method=method_name,
                    category_id=category.id,
                    category_name=category.name,
                    query_used="ERROR",
                    chunks=[],
                    avg_similarity=0
                ))

        all_results.extend(category_results)

    # 결과 저장
    output = {
        "experiment_date": datetime.now().isoformat(),
        "test_categories": TEST_CATEGORIES,
        "results": [asdict(r) for r in all_results]
    }

    with open("retrieval_experiment_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("\n\n" + "=" * 60)
    print("실험 완료! 결과가 retrieval_experiment_results.json에 저장되었습니다.")
    print("=" * 60)

    return all_results


if __name__ == "__main__":
    run_experiment()
