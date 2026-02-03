"""문제 생성 모듈 - HyperCLOVA X Structured Output 활용"""

import json
import requests

from config import config
from schemas import (
    GeneratedQuestion,
    QuestionType,
    Difficulty,
    QuestionGenerationContext,
)
from prompts import SYSTEM_PROMPT, build_generation_prompt
from token_calculator import calculate_cost, TokenUsage


def get_question_schema(target_count: int = 10) -> dict:
    """문제 수에 맞는 JSON 스키마 생성"""
    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_type": {
                            "type": "string",
                            "enum": ["multiple_choice", "short_answer", "essay"],
                            "description": "문제 유형",
                        },
                        "difficulty": {
                            "type": "integer",
                            "enum": [1, 2, 3, 4, 5],
                            "description": "난이도 (1=매우쉬움, 2=쉬움, 3=보통, 4=어려움, 5=매우어려움)",
                        },
                        "question": {
                            "type": "string",
                            "description": "질문 텍스트",
                        },
                        "answer": {
                            "type": "string",
                            "description": "정답 (단답형/서술형) 또는 객관식 정답 텍스트",
                        },
                        "explanation": {
                            "type": "string",
                            "description": "해설 (2-4문장으로 답변의 이유와 개념을 설명. 절대로 '청크', '문서', '출처' 등의 단어 사용 금지)",
                        },
                        "options": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "객관식 선택지 (4개, 객관식만 해당)",
                        },
                        "correct_index": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 3,
                            "description": "정답 인덱스 (반드시 0-3 사이의 '정수' 하나여야 하며, [0]과 같은 배열/리스트 형태는 절대 금지)",
                        },
                        "chunk_ids": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "참조한 청크 ID 목록",
                        },
                    },
                    "required": [
                        "question_type",
                        "difficulty",
                        "question",
                        "answer",
                        "explanation",
                        "chunk_ids",
                    ],
                },
                "minItems": max(3, target_count - 2),
                "maxItems": target_count + 2,
            }
        },
        "required": ["questions"],
    }


def call_clova_structured(
    system_prompt: str,
    user_prompt: str,
    schema: dict,
    temperature: float = 0.5,
    max_tokens: int = 8192,
) -> tuple[dict, TokenUsage]:
    """HyperCLOVA X API 직접 호출 (Reasoning + JSON Prompt)

    Args:
        system_prompt: 시스템 프롬프트
        user_prompt: 유저 프롬프트
        schema: JSON 스키마
        temperature: 온도 (기본값 0.5)
        max_tokens: 최대 토큰 수

    Returns:
        (파싱된 JSON 응답, 토큰 사용량)
    """
    url = f"https://clovastudio.stream.ntruss.com/v3/chat-completions/{config.LLM_MODEL}"
    headers = {
        "Authorization": f"Bearer {config.CLOVASTUDIO_API_KEY}",
        "Content-Type": "application/json",
    }

    # 스키마를 프롬프트에 포함 (Structured Output 대용)
    schema_str = json.dumps(schema, ensure_ascii=False, indent=2)
    schema_instruction = f"""

## Output Format (JSON Only)
You must output the result in strict JSON format adhering to the following schema.
Do not include any other text, explanations, or thinking process in the final output.

```json
{schema_str}
```
"""
    final_user_prompt = user_prompt + schema_instruction

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": final_user_prompt},
    ]

    data = {
        "messages": messages,
        "topP": 0.8,
        "topK": 0,
        "maxCompletionTokens": max_tokens,
        "temperature": temperature,
        "repetitionPenalty": 1.1,
        "thinking": {"effort": "high"},
        "stop": [],
        # responseFormat 제거됨 (Reasoning 모델 사용 시 프롬프트 지시로 대체)
    }

    # API 호출
    response = requests.post(url, headers=headers, json=data, timeout=120)
    response.raise_for_status()

    result = response.json()
    message = result["result"]["message"]
    content = message["content"]
    usage_info = result["result"].get("usage", {})

    # Markdown Code Block 제거 (```json ... ```)
    if "```" in content:
        content = content.replace("```json", "").replace("```", "").strip()

    # JSON 파싱 시도
    try:
        parsed_content = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"[오류] JSON 파싱 실패. 원본 응답:\n{content}")
        raise e

    # 토큰 사용량 정보 (response usage 활용)
    input_tokens = usage_info.get("promptTokens", 0)
    output_tokens = usage_info.get("completionTokens", 0)
    thinking_tokens = usage_info.get("completionTokensDetails", {}).get("thinkingTokens", 0)

    # 비용 계산 (추론 토큰도 output에 포함)
    usage = calculate_cost(input_tokens, output_tokens + thinking_tokens, model=config.LLM_MODEL)

    return parsed_content, usage


def generate_questions(
    context: QuestionGenerationContext,
) -> tuple[list[GeneratedQuestion], TokenUsage]:
    """문제 생성

    Args:
        context: 문제 생성 컨텍스트 (카테고리 정보 + 청크)

    Returns:
        (생성된 문제 리스트, 토큰 사용량)
    """
    # 청크 데이터 준비 (ID, 내용 튜플)
    chunks_with_ids = list(zip(context.chunk_ids, context.chunks))
    valid_chunk_ids = set(context.chunk_ids)
    target_count = context.target_question_count

    # 프롬프트 빌드
    user_prompt = build_generation_prompt(
        category_name=context.category_name,
        category_path=context.category_path,
        chunks=chunks_with_ids,
        target_count=target_count,
    )

    # 동적 스키마 생성
    schema = get_question_schema(target_count)

    # HyperCLOVA X API 직접 호출
    response, usage = call_clova_structured(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=schema,
        temperature=config.TEMPERATURE,
    )

    # 응답 파싱 및 변환
    questions = []
    for q_data in response.get("questions", []):
        # 청크 ID 검증: 유효한 ID만 필터링
        raw_chunk_ids = q_data.get("chunk_ids", [])
        filtered_chunk_ids = [cid for cid in raw_chunk_ids if cid in valid_chunk_ids]

        # 청크 ID가 없거나 모두 유효하지 않으면 스킵
        if not filtered_chunk_ids:
            print(f"[경고] 유효하지 않은 청크 ID로 생성된 문제 스킵: {q_data.get('question', '')[:50]}...")
            continue

        try:
            question = GeneratedQuestion(
                question_type=QuestionType(q_data["question_type"]),
                difficulty=Difficulty(q_data["difficulty"]),
                question=q_data["question"],
                answer=q_data["answer"],
                explanation=q_data.get("explanation", ""),
                options=q_data.get("options", []),
                correct_index=q_data.get("correct_index", 0),
                category_id=context.category_id,
                category_name=context.category_name,
                chunk_ids=filtered_chunk_ids,
            )
        except (ValueError, KeyError) as e:
            print(f"[경고] 문제 파싱 실패, 스킵: {e}")
            continue

        # 유효성 검증
        is_valid, msg = question.validate()
        if is_valid:
            questions.append(question)
        else:
            print(f"[경고] 문제 검증 실패: {msg}")

    return questions, usage


def generate_questions_batch(
    contexts: list[QuestionGenerationContext],
) -> tuple[dict[int, list[GeneratedQuestion]], TokenUsage]:
    """여러 카테고리에 대해 일괄 문제 생성

    Args:
        contexts: 문제 생성 컨텍스트 리스트

    Returns:
        (카테고리 ID를 키로 하는 문제 리스트 딕셔너리, 총 토큰 사용량)
    """
    results = {}
    total_usage = TokenUsage()

    for i, context in enumerate(contexts):
        print(f"[{i+1}/{len(contexts)}] {context.category_name} 문제 생성 중...")
        try:
            questions, usage = generate_questions(context)
            results[context.category_id] = questions

            # 토큰 사용량 누적
            total_usage.input_tokens += usage.input_tokens
            total_usage.output_tokens += usage.output_tokens
            total_usage.input_cost += usage.input_cost
            total_usage.output_cost += usage.output_cost
            total_usage.total_cost += usage.total_cost

            print(f"  → {len(questions)}개 문제 생성 완료 (비용: {usage.total_cost:.2f}원)")
        except Exception as e:
            print(f"  → 실패: {e}")
            results[context.category_id] = []

    return results, total_usage
