from dataclasses import dataclass
import requests
from config import config
from db import get_connection, get_cursor
from category_loader import get_leaf_category_with_least_questions
from hyde_generator import generate_hyde_query
from token_calculator import TokenUsage


@dataclass
class RetrievedChunk:
    id: int
    content: str
    similarity: float


def get_query_embedding(query: str) -> list[float]:
    """Clova Embedding v2 API로 쿼리를 임베딩 벡터로 변환"""
    url = "https://clovastudio.stream.ntruss.com/v1/api-tools/embedding/v2/"
    headers = {
        "Authorization": f"Bearer {config.CLOVASTUDIO_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {"text": query}

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    result = response.json()
    return result["result"]["embedding"]


def retrieve_similar_chunks(query_embedding: list[float], top_k: int = 5) -> list[RetrievedChunk]:
    """벡터 유사도 기반 Top-K 청크 검색 (Vector Only)"""
    query = """
    SELECT id, content, embedding <=> %s::vector AS distance
    FROM document_embeddings
    ORDER BY distance ASC
    LIMIT %s
    """
    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query, (query_embedding, top_k))
            results = cursor.fetchall()

            return [
                RetrievedChunk(
                    id=row["id"],
                    content=row["content"],
                    similarity=1 - row["distance"]
                )
                for row in results
            ]


def retrieve_hybrid_chunks(
    query_embedding: list[float],
    keyword: str,
    top_k: int = 5,
    vector_weight: float = 0.7
) -> list[RetrievedChunk]:
    """Hybrid Search: 벡터 유사도 + 키워드 매칭"""
    query = """
    WITH vector_search AS (
        SELECT id, content, embedding <=> %s::vector AS vector_distance
        FROM document_embeddings
    ),
    keyword_search AS (
        SELECT id, ts_rank(tsvector, plainto_tsquery('english', %s)) AS keyword_rank
        FROM document_embeddings
        WHERE tsvector @@ plainto_tsquery('english', %s)
    )
    SELECT
        v.id,
        v.content,
        v.vector_distance,
        COALESCE(k.keyword_rank, 0) AS keyword_rank,
        v.vector_distance * %s + (1 - COALESCE(k.keyword_rank, 0)) * %s AS hybrid_score
    FROM vector_search v
    LEFT JOIN keyword_search k ON v.id = k.id
    ORDER BY hybrid_score ASC
    LIMIT %s
    """
    keyword_weight = 1 - vector_weight

    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query, (
                query_embedding,
                keyword,
                keyword,
                vector_weight,
                keyword_weight,
                top_k
            ))
            results = cursor.fetchall()

            return [
                RetrievedChunk(
                    id=row["id"],
                    content=row["content"],
                    similarity=1 - row["vector_distance"]
                )
                for row in results
            ]


def retrieve_chunks_for_query(hyde_query: str, top_k: int = 5) -> list[RetrievedChunk]:
    """HyDE 쿼리로 유사 청크 검색 (편의 함수)"""
    query_embedding = get_query_embedding(hyde_query)
    return retrieve_similar_chunks(query_embedding, top_k)


def extract_keywords_from_category(category: "CategoryInfo") -> str:
    """카테고리 정보에서 키워드 추출"""
    # 경로에서 ' > ' 구분자 제거하고 모든 단어 결합
    path_words = category.path.replace(" > ", " ")
    return path_words


def retrieve_chunks(
    category: "CategoryInfo", top_k: int = 5
) -> tuple[list[RetrievedChunk], TokenUsage]:
    """HyDE + Vector 전략으로 청크 검색 (메인 검색 함수)

    Args:
        category: 카테고리 정보
        top_k: 검색할 청크 수

    Returns:
        (검색된 청크 리스트, HyDE 생성 토큰 사용량)
    """
    # 1. HyDE 쿼리 생성 (토큰 사용량 포함)
    hyde_query, usage = generate_hyde_query(category)

    # 2. 쿼리 임베딩
    query_embedding = get_query_embedding(hyde_query)

    # 3. Vector 유사도 검색
    chunks = retrieve_similar_chunks(query_embedding, top_k)

    return chunks, usage


if __name__ == "__main__":
    from category_loader import CategoryInfo

    print("=== Retriever 검증 (Vector vs Hybrid 비교) ===\n")

    # TCP IP Architecture 카테고리
    category = CategoryInfo(
        id=11,
        name="tcp ip architecture",
        path="Computer Networks > Network Architecture & Models > tcp ip architecture",
        question_count=0
    )
    print(f"테스트 카테고리: {category.name}")
    print(f"경로: {category.path}")

    # 키워드 추출
    keyword = extract_keywords_from_category(category)
    print(f"추출된 키워드: {keyword}")

    # HyDE 쿼리 생성
    print("\n1. HyDE 쿼리 생성 중...")
    hyde_query = generate_hyde_query(category)
    print(f"   쿼리 길이: {len(hyde_query.split())} 단어")

    # 임베딩 생성
    print("\n2. 쿼리 임베딩 생성...")
    query_embedding = get_query_embedding(hyde_query)

    # 방법 1: Vector Only
    print(f"\n{'='*50}")
    print("방법 1: Vector Only Search")
    print('='*50)
    vector_chunks = retrieve_similar_chunks(query_embedding, config.TOP_K_CHUNKS)
    for i, chunk in enumerate(vector_chunks, 1):
        print(f"\n[{i}] ID: {chunk.id}, 유사도: {chunk.similarity:.4f}")
        preview = chunk.content[:80].replace("\n", " ")
        print(f"    {preview}...")

    # 방법 2: Hybrid Search
    print(f"\n{'='*50}")
    print("방법 2: Hybrid Search (Vector 70% + Keyword 30%)")
    print('='*50)
    hybrid_chunks = retrieve_hybrid_chunks(query_embedding, keyword, config.TOP_K_CHUNKS)
    for i, chunk in enumerate(hybrid_chunks, 1):
        print(f"\n[{i}] ID: {chunk.id}, 유사도: {chunk.similarity:.4f}")
        preview = chunk.content[:80].replace("\n", " ")
        print(f"    {preview}...")
