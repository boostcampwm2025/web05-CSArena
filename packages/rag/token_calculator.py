"""토큰 계산 및 비용 추적 모듈"""

import requests
from typing import Optional
from dataclasses import dataclass, field
from config import config


# 모델별 가격 정보 (1000 토큰당, 단위: 원)
MODEL_PRICING = {
    "HCX-007": {"input": 1.5, "output": 5.0},
    "HCX-DASH-002": {"input": 0.5, "output": 2.0},
    # 다른 모델 추가 가능
}

# 기본 가격 (모델 정보가 없을 때)
DEFAULT_PRICING = {"input": 1.5, "output": 5.0}


@dataclass
class TokenUsage:
    """토큰 사용량 정보"""

    input_tokens: int = 0
    output_tokens: int = 0
    input_cost: float = 0.0
    output_cost: float = 0.0
    total_cost: float = 0.0


@dataclass
class TokenTracker:
    """전체 파이프라인의 토큰 사용량 추적"""

    hyde_generation: TokenUsage = field(default_factory=TokenUsage)
    question_generation: TokenUsage = field(default_factory=TokenUsage)
    ragas_evaluation: TokenUsage = field(default_factory=TokenUsage)

    def get_total_usage(self) -> TokenUsage:
        """전체 토큰 사용량 및 비용 계산"""
        total = TokenUsage()
        for usage in [
            self.hyde_generation,
            self.question_generation,
            self.ragas_evaluation,
        ]:
            total.input_tokens += usage.input_tokens
            total.output_tokens += usage.output_tokens
            total.input_cost += usage.input_cost
            total.output_cost += usage.output_cost
            total.total_cost += usage.total_cost
        return total

    def print_report(self):
        """비용 리포트 출력"""
        print("\n" + "=" * 80)
        print("토큰 사용량 및 비용 리포트")
        print("=" * 80)

        print("\n[1] HyDE 쿼리 생성")
        self._print_usage(self.hyde_generation)

        print("\n[2] 질문 생성")
        self._print_usage(self.question_generation)

        print("\n[3] RAGAS 평가")
        self._print_usage(self.ragas_evaluation)

        print("\n" + "-" * 80)
        print("[전체 합계]")
        total = self.get_total_usage()
        self._print_usage(total)
        print("=" * 80)

    def _print_usage(self, usage: TokenUsage):
        """개별 사용량 출력"""
        print(f"  Input 토큰:  {usage.input_tokens:,} 토큰 → {usage.input_cost:.2f}원")
        print(
            f"  Output 토큰: {usage.output_tokens:,} 토큰 → {usage.output_cost:.2f}원"
        )
        print(f"  총 비용:     {usage.total_cost:.2f}원")


def calculate_cost(
    input_tokens: int, output_tokens: int, model: Optional[str] = None
) -> TokenUsage:
    """토큰 수로부터 비용 계산

    Args:
        input_tokens: 입력 토큰 수
        output_tokens: 출력 토큰 수
        model: 모델 이름 (기본값: config.LLM_MODEL)

    Returns:
        TokenUsage 객체
    """
    model_name = model or config.LLM_MODEL
    pricing = MODEL_PRICING.get(model_name, DEFAULT_PRICING)

    input_cost = (input_tokens / 1000) * pricing["input"]
    output_cost = (output_tokens / 1000) * pricing["output"]
    total_cost = input_cost + output_cost

    return TokenUsage(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        input_cost=input_cost,
        output_cost=output_cost,
        total_cost=total_cost,
    )


def tokenize_messages(
    messages: list[dict],
    response_format: Optional[dict] = None,
    tools: Optional[list[dict]] = None,
    model: Optional[str] = None,
) -> dict:
    """Clova Studio Chat Tokenize API 호출

    Args:
        messages: 메시지 리스트 [{"role": "system"|"user", "content": "..."}]
        response_format: Structured Output 스키마 (선택)
        tools: Function calling tools (선택)
        model: 사용할 모델 이름 (기본값: config.LLM_MODEL)

    Returns:
        토큰 계산 결과
        {
            "status": {"code": "20000", "message": "OK"},
            "result": {
                "messages": [...],
                "responseFormat": {"count": 86},  # optional
                "tools": {"count": 230}  # optional
            }
        }
    """
    model_name = model or config.LLM_MODEL
    url = f"https://clovastudio.stream.ntruss.com/v3/api-tools/chat-tokenize/{model_name}"
    headers = {
        "Authorization": f"Bearer {config.CLOVASTUDIO_API_KEY}",
        "Content-Type": "application/json",
    }

    data = {"messages": messages}

    if response_format:
        data["responseFormat"] = response_format

    if tools:
        data["tools"] = tools
        data["toolChoice"] = "auto"

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    return response.json()


def count_input_tokens(
    messages: list[dict],
    response_format: Optional[dict] = None,
    tools: Optional[list[dict]] = None,
    model: Optional[str] = None,
) -> int:
    """입력 토큰 수 계산

    Args:
        messages: 메시지 리스트
        response_format: Structured Output 스키마 (선택)
        tools: Function calling tools (선택)
        model: 사용할 모델 이름 (기본값: config.LLM_MODEL)

    Returns:
        총 입력 토큰 수
    """
    result = tokenize_messages(messages, response_format, tools, model)

    total_tokens = 0

    # 메시지 토큰 합계
    for msg in result["result"]["messages"]:
        for content_item in msg["content"]:
            total_tokens += content_item["count"]

    # responseFormat 토큰 (Structured Output 사용 시)
    if "responseFormat" in result["result"]:
        total_tokens += result["result"]["responseFormat"]["count"]

    # tools 토큰 (Function calling 사용 시)
    if "tools" in result["result"]:
        total_tokens += result["result"]["tools"]["count"]

    return total_tokens


if __name__ == "__main__":
    print("=== Token Calculator 테스트 ===\n")

    # 테스트 1: 간단한 메시지
    print("1. 간단한 메시지 토큰 계산:")
    messages = [
        {"role": "system", "content": "당신은 도움이 되는 AI 어시스턴트입니다."},
        {"role": "user", "content": "안녕하세요. 오늘 날씨가 어떤가요?"},
    ]

    try:
        tokens = count_input_tokens(messages)
        print(f"   입력 토큰: {tokens}")
    except Exception as e:
        print(f"   오류: {e}")

    # 테스트 2: Structured Output 포함
    print("\n2. Structured Output 포함 토큰 계산:")
    schema = {
        "type": "json",
        "schema": {
            "type": "object",
            "properties": {
                "temperature": {"type": "number"},
                "condition": {"type": "string"},
            },
            "required": ["temperature", "condition"],
        },
    }

    try:
        tokens = count_input_tokens(messages, response_format=schema)
        print(f"   입력 토큰 (스키마 포함): {tokens}")
    except Exception as e:
        print(f"   오류: {e}")

    # 테스트 3: 비용 계산 (HCX-007)
    print("\n3. 비용 계산 예시 (HCX-007):")
    input_tokens = 500
    output_tokens = 1000
    usage = calculate_cost(input_tokens, output_tokens, model="HCX-007")
    print(f"   Input: {usage.input_tokens} 토큰 → {usage.input_cost:.2f}원")
    print(f"   Output: {usage.output_tokens} 토큰 → {usage.output_cost:.2f}원")
    print(f"   총 비용: {usage.total_cost:.2f}원")

    # 테스트 3-2: 비용 계산 (HCX-DASH-002)
    print("\n3-2. 비용 계산 예시 (HCX-DASH-002):")
    usage2 = calculate_cost(input_tokens, output_tokens, model="HCX-DASH-002")
    print(f"   Input: {usage2.input_tokens} 토큰 → {usage2.input_cost:.2f}원")
    print(f"   Output: {usage2.output_tokens} 토큰 → {usage2.output_cost:.2f}원")
    print(f"   총 비용: {usage2.total_cost:.2f}원")

    # 테스트 4: TokenTracker
    print("\n4. TokenTracker 테스트:")
    tracker = TokenTracker()
    tracker.hyde_generation = calculate_cost(300, 100, model="HCX-007")
    tracker.question_generation = calculate_cost(2000, 3000, model="HCX-007")
    tracker.ragas_evaluation = calculate_cost(5000, 2000, model="HCX-DASH-002")
    tracker.print_report()
