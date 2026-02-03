"""Clova Reranker API 모듈"""

import requests
from dataclasses import dataclass
from config import config
from token_calculator import TokenUsage, calculate_cost


@dataclass
class RerankerResult:
    """Reranker 결과"""
    cited_doc_ids: list[str]
    cited_docs: list[str]
    usage: TokenUsage


def rerank_chunks(
    query: str,
    chunks: list[dict],
    max_tokens: int = 1024
) -> RerankerResult:
    """Clova Reranker API 호출

    Args:
        query: 검색 쿼리 (HyDE 쿼리)
        chunks: 검색된 청크 리스트 [{"id": int, "content": str}, ...]
        max_tokens: 최대 출력 토큰 (기본값 1024, 최대 4096)

    Returns:
        RerankerResult: 인용된 문서 ID 목록과 토큰 사용량
    """
    url = "https://clovastudio.stream.ntruss.com/v1/api-tools/reranker"
    headers = {
        "Authorization": f"Bearer {config.CLOVASTUDIO_API_KEY}",
        "Content-Type": "application/json",
    }

    # 청크를 documents 형식으로 변환
    documents = [
        {"id": str(chunk["id"]), "doc": chunk["content"]}
        for chunk in chunks
    ]

    data = {
        "documents": documents,
        "query": query,
        "maxTokens": max_tokens,
    }

    response = requests.post(url, headers=headers, json=data, timeout=120)
    response.raise_for_status()

    result = response.json()

    # 인용된 문서 추출
    cited_documents = result.get("result", {}).get("citedDocuments", [])
    cited_doc_ids = [doc["id"] for doc in cited_documents]
    cited_docs = [doc["doc"] for doc in cited_documents]

    # 토큰 사용량 계산 (HCX-007과 동일 요금)
    usage_data = result.get("result", {}).get("usage", {})
    usage = calculate_cost(
        input_tokens=usage_data.get("promptTokens", 0),
        output_tokens=usage_data.get("completionTokens", 0),
        model="HCX-007"
    )

    return RerankerResult(
        cited_doc_ids=cited_doc_ids,
        cited_docs=cited_docs,
        usage=usage,
    )


def get_question_count(cited_count: int) -> int:
    """인용된 청크 수에 따라 생성할 문제 수 결정

    Args:
        cited_count: 인용된 청크 수

    Returns:
        생성할 문제 수
    """
    if cited_count >= 5:
        return 10
    elif cited_count >= 3:
        return 7
    elif cited_count >= 1:
        return 5
    else:
        return 0  # 스킵


if __name__ == "__main__":
    print("=== Reranker 테스트 ===\n")

    # 테스트 데이터
    test_chunks = [
        {"id": 1, "content": "HTTP는 HyperText Transfer Protocol의 약자로, 웹에서 데이터를 주고받는 프로토콜이다."},
        {"id": 2, "content": "TCP는 신뢰성 있는 연결 지향 프로토콜로, 3-way handshake를 통해 연결을 설정한다."},
        {"id": 3, "content": "UDP는 비연결 지향 프로토콜로, 빠른 전송이 필요한 경우 사용된다."},
    ]

    test_query = "HTTP 프로토콜의 특징과 동작 방식에 대해 설명하시오."

    try:
        result = rerank_chunks(test_query, test_chunks)
        print(f"인용된 문서 ID: {result.cited_doc_ids}")
        print(f"인용된 문서 수: {len(result.cited_doc_ids)}")
        print(f"생성할 문제 수: {get_question_count(len(result.cited_doc_ids))}")
        print(f"토큰 사용량: {result.usage.input_tokens} + {result.usage.output_tokens} = {result.usage.input_tokens + result.usage.output_tokens}")
        print(f"비용: {result.usage.total_cost:.2f}원")
    except Exception as e:
        print(f"오류: {e}")
