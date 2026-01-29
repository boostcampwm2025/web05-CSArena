"""해설 후처리 모듈 - ChatGoogleGenerativeAI (Gemini 2.0 Flash) 사용"""

import json
import time

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import config
from token_calculator import (
    get_usd_to_krw_rate,
    GEMINI_2_0_FLASH_INPUT_COST_PER_TOKEN,
    GEMINI_2_0_FLASH_OUTPUT_COST_PER_TOKEN,
    TokenUsage,
)


SYSTEM_PROMPT = """당신은 기술 면접 문제의 해설을 교정하는 전문가입니다.

다음 규칙에 따라 해설을 수정하세요:

1. **내부 참조 제거**: "청크", "문서", "ID", "번", "출처" 등 데이터 소스를 암시하는 표현을 모두 제거
   - "청크 3970에 따르면" → 삭제
   - "청크 3065에서" → 삭제
   - "문서에 따르면" → 삭제

2. **어색한 표현 교정**: 영어/한국어 혼합 표현을 자연스럽게 수정
   - "상태lessness" → "무상태성(Statelessness)"

3. **의미 보존**: 기술적 내용과 의미는 반드시 유지

4. **자연스러운 문장**: 면접관이 직접 설명하는 것처럼 자연스럽게 작성

반드시 JSON 형식으로 응답하세요:
{"cleaned_explanation": "교정된 해설"}"""


MAX_RETRIES = 3
RETRY_DELAY = 2.0


def postprocess_explanation(explanation: str) -> tuple[str, TokenUsage]:
    """해설 후처리 (ChatGoogleGenerativeAI - Gemini 2.0 Flash)

    Args:
        explanation: 원본 해설

    Returns:
        (교정된 해설, 토큰 사용량)
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=config.GEMINI_API_KEY,
        temperature=0.1,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"다음 해설을 교정하세요:\n\n{explanation}"),
    ]

    for attempt in range(MAX_RETRIES):
        try:
            response = llm.invoke(messages)

            # JSON 파싱
            text = response.content
            # JSON 블록 추출 (```json ... ``` 형태일 수 있음)
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            result = json.loads(text)

            # 토큰 사용량 계산
            usage_meta = response.usage_metadata or {}
            input_tokens = usage_meta.get("input_tokens", 0)
            output_tokens = usage_meta.get("output_tokens", 0)

            rate = get_usd_to_krw_rate()
            input_cost = input_tokens * GEMINI_2_0_FLASH_INPUT_COST_PER_TOKEN * rate
            output_cost = output_tokens * GEMINI_2_0_FLASH_OUTPUT_COST_PER_TOKEN * rate

            usage = TokenUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                input_cost=input_cost,
                output_cost=output_cost,
                total_cost=input_cost + output_cost,
            )

            return result["cleaned_explanation"], usage

        except Exception as e:
            if "429" in str(e) and attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue
            raise


def postprocess_questions(questions: list[dict]) -> tuple[list[dict], TokenUsage]:
    """문제 리스트의 해설 일괄 후처리

    Args:
        questions: 문제 딕셔너리 리스트

    Returns:
        (후처리된 문제 리스트, 총 토큰 사용량)
    """
    total_usage = TokenUsage()
    processed = []

    for q in questions:
        q_copy = q.copy()

        try:
            cleaned, usage = postprocess_explanation(q["explanation"])
            q_copy["explanation"] = cleaned

            total_usage.input_tokens += usage.input_tokens
            total_usage.output_tokens += usage.output_tokens
            total_usage.input_cost += usage.input_cost
            total_usage.output_cost += usage.output_cost
            total_usage.total_cost += usage.total_cost

        except Exception as e:
            # 후처리 실패 시 원본 유지
            print(f"[경고] 해설 후처리 실패: {e}")

        processed.append(q_copy)

    return processed, total_usage


if __name__ == "__main__":
    # 테스트
    test_explanations = [
        "청크 3970에 따르면 REST는 HTTP 메서드와 페이로드 중심이고, WSDL은 사용자 정의 연산으로 절차를 구현합니다.",
        "REST의 핵심 원칙은 상태lessness(Stateless), 자원 중심(URI), 표준 HTTP 메서드 사용 등이다.",
    ]

    print("=== 해설 후처리 테스트 ===\n")

    for i, exp in enumerate(test_explanations, 1):
        print(f"[테스트 {i}]")
        print(f"원본: {exp}")

        try:
            cleaned, usage = postprocess_explanation(exp)
            print(f"결과: {cleaned}")
            print(f"비용: {usage.total_cost:.2f}원")
        except Exception as e:
            print(f"오류: {e}")

        print()
