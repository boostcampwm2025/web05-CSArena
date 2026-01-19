from langchain_naver import ChatClovaX
from langchain_core.messages import SystemMessage, HumanMessage
from config import config
from category_loader import CategoryInfo, get_leaf_category_with_least_questions

SYSTEM_PROMPT = """당신은 IT 기술 문서 검색 전문가입니다.
주어진 주제에 대해 의미론적 검색(semantic search)에 최적화된 쿼리를 생성합니다.

**규칙:**
1. 주제의 핵심 개념을 명확하게 설명하는 문장만을 작성합니다.
2. 주제가 가장 중요하므로 주제 관련 설명을 먼저 작성합니다.
3. 한국 IT 기술 면접에서 자주 출제되는 관점을 반영합니다.
4. 반드시 영어(English)로 작성합니다.
5. 100단어 이내로 작성합니다."""


def generate_hyde_query(category: CategoryInfo) -> str:
    """HyDE 기반 검색 최적화 쿼리 생성"""
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

    response = llm.invoke(messages)
    return response.content


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
        hyde_query = generate_hyde_query(category)
        print(f"\n   생성된 쿼리:")
        print(f"   {hyde_query}")
        print("\n   [성공] API 호출 및 쿼리 생성 완료")
    except Exception as e:
        print(f"\n   [실패] 오류 발생: {e}")
