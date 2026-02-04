"""토큰 계산 및 비용 추적 모듈"""

import requests
import typing as t
from typing import Optional, Union
from dataclasses import dataclass, field
from functools import lru_cache

from langchain_core.outputs import ChatGeneration, LLMResult, ChatResult

from config import config


# ============================================================
# 환율 관련
# ============================================================

NAVER_EXCHANGE_API_URL = (
    "https://m.search.naver.com/p/csearch/content/qapirender.nhn"
    "?key=calculator&pkid=141&q=%ED%99%98%EC%9C%A8&where=m"
    "&u1=keb&u6=standardUnit&u7=0&u3=USD&u4=KRW&u8=down&u2=1"
)

DEFAULT_USD_TO_KRW = 1450.0


@lru_cache(maxsize=1)
def get_usd_to_krw_rate() -> float:
    """네이버 API를 통해 실시간 USD-KRW 환율 조회"""
    try:
        response = requests.get(NAVER_EXCHANGE_API_URL, timeout=5)
        response.raise_for_status()
        data = response.json()
        rate_str = data["country"][1]["value"]
        return float(rate_str.replace(",", ""))
    except Exception as e:
        print(f"[경고] 환율 조회 실패, 기본값 사용: {e}")
        return DEFAULT_USD_TO_KRW


# ============================================================
# 모델별 가격 정보
# ============================================================

# HCX 모델 가격 (1000 토큰당, 단위: 원)
MODEL_PRICING = {
    "HCX-007": {"input": 1.5, "output": 5.0},
    "HCX-DASH-002": {"input": 0.5, "output": 2.0},
}

# Gemini 모델 가격 (per token, 단위: USD) - RAGAS total_cost()에서 사용
# result.total_cost(cost_per_input_token=GEMINI_INPUT_COST_PER_TOKEN, ...)
GEMINI_2_0_FLASH_INPUT_COST_PER_TOKEN = 0.10 / 1e6   # $0.10 / 1M tokens
GEMINI_2_0_FLASH_OUTPUT_COST_PER_TOKEN = 0.40 / 1e6  # $0.40 / 1M tokens

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


# ============================================================
# RAGAS용 Gemini 토큰 파서
# ============================================================

def _get_from_dict(data_dict: dict, key: str, default=None) -> t.Any:
    """중첩 딕셔너리에서 dot notation으로 값 추출"""
    keys = key.split(".")
    current = data_dict

    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return default

    return current


class RagasTokenUsage:
    """RAGAS 호환 토큰 사용량 클래스"""

    def __init__(self, input_tokens: int, output_tokens: int, model: str = ""):
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.model = model

    def __add__(self, other: "RagasTokenUsage") -> "RagasTokenUsage":
        return RagasTokenUsage(
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            model=self.model or other.model,
        )

    def __radd__(self, other):
        if other == 0:
            return self
        return self.__add__(other)

    def cost(
        self,
        cost_per_input_token: float,
        cost_per_output_token: t.Optional[float] = None,
    ) -> float:
        """토큰 비용 계산 (RAGAS CostCallbackHandler.total_cost()에서 호출)"""
        if cost_per_output_token is None:
            cost_per_output_token = cost_per_input_token
        return (
            self.input_tokens * cost_per_input_token
            + self.output_tokens * cost_per_output_token
        )


def get_token_usage_for_gemini(
    llm_result: Union[LLMResult, ChatResult],
) -> RagasTokenUsage:
    """Gemini 모델의 토큰 사용량 추출 (RAGAS token_usage_parser용)

    Gemini usage_metadata 구조:
    - input_tokens: input 토큰
    - output_tokens: output 토큰
    """
    token_usages = []

    for gs in llm_result.generations:
        for g in gs:
            if isinstance(g, ChatGeneration):
                # usage_metadata에서 토큰 정보 추출
                usage_meta = getattr(g.message, "usage_metadata", None)
                if usage_meta:
                    token_usages.append(
                        RagasTokenUsage(
                            input_tokens=usage_meta.get("input_tokens", 0),
                            output_tokens=usage_meta.get("output_tokens", 0),
                            model=_get_from_dict(
                                g.message.response_metadata, "model_name", ""
                            ),
                        )
                    )

    if token_usages:
        model = next((u.model for u in token_usages if u.model), "")
        return sum(token_usages, RagasTokenUsage(0, 0, model))

    return RagasTokenUsage(0, 0)
