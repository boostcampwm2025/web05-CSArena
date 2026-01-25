from langchain_naver import ChatClovaX
from langchain_core.messages import SystemMessage, HumanMessage
from config import config
from category_loader import CategoryInfo, get_leaf_category_with_least_questions
from token_calculator import calculate_cost, TokenUsage

SYSTEM_PROMPT = """당신은 IT 기술 문서 검색 전문가입니다.
주어진 주제에 대해 의미론적 검색(semantic search)에 최적화된 쿼리를 생성합니다.

**규칙:**
1. 주제의 핵심 개념을 명확하게 설명하는 문장만을 작성합니다.
2. 주제가 가장 중요하므로 주제 관련 설명을 먼저 작성합니다.
3. 한국 IT 기술 면접에서 자주 출제되는 관점을 반영합니다.
4. 반드시 영어(English)로 작성합니다.
5. 100단어 이내로 작성합니다."""


def generate_hyde_query(category: CategoryInfo) -> tuple[str, TokenUsage]:
    """HyDE 기반 검색 최적화 쿼리 생성

    Returns:
        (생성된 쿼리, 토큰 사용량)
    """
    llm = ChatClovaX(
        model=config.LLM_MODEL,
        temperature=config.TEMPERATURE,
    )

    user_input = f"""Topic: {category.name}
Category Path: {category.path}"""

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_input),
    ]

    # LLM 호출
    response = llm.invoke(messages)

    # response_metadata에서 토큰 사용량 추출
    usage_info = response.response_metadata.get("usage", {})
    input_tokens = usage_info.get("promptTokens", 0)
    output_tokens = usage_info.get("completionTokens", 0)

    # 비용 계산 (HyDE는 config.LLM_MODEL 사용)
    usage = calculate_cost(input_tokens, output_tokens, model=config.LLM_MODEL)

    return response.content, usage


if __name__ == "__main__":
    print("=== HyDE Generator 검증 ===\n")

    # 1. 카테고리 선정
    print("1. 테스트 카테고리 선정:")
    category = get_leaf_category_with_least_questions()
    if not category:
        print("   카테고리를 찾을 수 없습니다.")
        exit(1)

    print(f"   이름: {category.name}")
    print(f"   경로: {category.path}")

    # 2. HyDE 쿼리 생성
    print("\n2. HyDE 쿼리 생성 중...")
    try:
        hyde_query, usage = generate_hyde_query(category)
        print(f"\n   생성된 쿼리:")
        print(f"   {hyde_query}")
        print("\n   [토큰 사용량]")
        print(f"   Input:  {usage.input_tokens} 토큰 → {usage.input_cost:.2f}원")
        print(f"   Output: {usage.output_tokens} 토큰 → {usage.output_cost:.2f}원")
        print(f"   총 비용: {usage.total_cost:.2f}원")
        print("\n   [성공] API 호출 및 쿼리 생성 완료")
    except Exception as e:
        print(f"\n   [실패] 오류 발생: {e}")
