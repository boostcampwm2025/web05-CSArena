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
from token_calculator import count_input_tokens, calculate_cost, TokenUsage


# Structured Output을 위한 JSON 스키마
QUESTION_SCHEMA = {
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
                        "enum": [1, 2, 3],
                        "description": "난이도 (1=기초, 2=중급, 3=심화)",
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
            "minItems": 5,
            "maxItems": 10,
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

    # 입력 토큰 계산
    input_tokens = count_input_tokens(messages)

    # API 호출
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    result = response.json()
    message = result["result"]["message"]
    content = message["content"]
    usage_info = result["result"].get("usage", {})

    # 추론 토큰(Thinking Tokens) 추출 및 출력
    thinking_tokens = usage_info.get("completionTokensDetails", {}).get("thinkingTokens", 0)
    if thinking_tokens > 0:
        print(f"   [Reasoning] 추론 토큰 사용량: {thinking_tokens} tokens")

    # Markdown Code Block 제거 (```json ... ```)
    if "```" in content:
        content = content.replace("```json", "").replace("```", "").strip()

    # JSON 파싱 시도
    try:
        parsed_content = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"[오류] JSON 파싱 실패. 원본 응답:\n{content}")
        raise e

    # 토큰 사용량 정보 업데이트 (API 응답값 우선 사용)
    if usage_info:
        input_tokens = usage_info.get("promptTokens", input_tokens)
        output_tokens = usage_info.get("completionTokens", 0)
    else:
        # 응답에 usage가 없는 경우 수동 계산
        output_messages = [{"role": "assistant", "content": content}]
        output_tokens = count_input_tokens(output_messages)

    # 비용 계산 (질문 생성은 config.LLM_MODEL 사용)
    usage = calculate_cost(input_tokens, output_tokens, model=config.LLM_MODEL)

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

    # 프롬프트 빌드
    user_prompt = build_generation_prompt(
        category_name=context.category_name,
        category_path=context.category_path,
        chunks=chunks_with_ids,
    )

    # HyperCLOVA X API 직접 호출
    response, usage = call_clova_structured(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=QUESTION_SCHEMA,
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


if __name__ == "__main__":
    from category_loader import get_leaf_category_with_least_questions
    from retriever import retrieve_chunks

    print("=== Question Generator 검증 ===\n")

    # 1. 테스트 카테고리 선정
    print("1. 테스트 카테고리 선정:")
    category = get_leaf_category_with_least_questions()
    if not category:
        print("   카테고리를 찾을 수 없습니다.")
        exit(1)

    print(f"   이름: {category.name}")
    print(f"   경로: {category.path}")
    print(f"   ID: {category.id}")

    # 2. 청크 검색
    print("\n2. 청크 검색 중...")
    chunks, hyde_usage = retrieve_chunks(category, top_k=config.TOP_K_CHUNKS)
    print(f"   {len(chunks)}개 청크 검색 완료")

    if not chunks:
        print("   검색된 청크가 없습니다.")
        exit(1)

    # 청크 미리보기
    for i, chunk in enumerate(chunks, 1):
        preview = chunk.content[:60].replace("\n", " ")
        print(f"   [{i}] ID:{chunk.id}, 유사도:{chunk.similarity:.4f} - {preview}...")

    # 3. 컨텍스트 생성
    context = QuestionGenerationContext(
        category_id=category.id,
        category_name=category.name,
        category_path=category.path,
        chunks=[c.content for c in chunks],
        chunk_ids=[c.id for c in chunks],
    )

    # 4. 문제 생성
    print("\n3. 문제 생성 중...")
    try:
        questions, usage = generate_questions(context)
        print(f"\n   [성공] {len(questions)}개 문제 생성 완료")
        print(f"\n   [토큰 사용량]")
        print(f"   Input:  {usage.input_tokens} 토큰 → {usage.input_cost:.2f}원")
        print(f"   Output: {usage.output_tokens} 토큰 → {usage.output_cost:.2f}원")
        print(f"   총 비용: {usage.total_cost:.2f}원")

        # 결과 출력 (전체)
        print("\n4. 생성된 문제 목록:")
        print("=" * 80)

        for i, q in enumerate(questions, 1):
            print(f"\n[{i}] {q.question_type.value.upper()} / 난이도 {q.difficulty.value}")
            print(f"질문: {q.question}")

            if q.question_type == QuestionType.MULTIPLE_CHOICE:
                for j, opt in enumerate(q.options):
                    marker = "✓" if j == q.correct_index else " "
                    print(f"  {marker} {j+1}. {opt}")

            print(f"정답: {q.answer}")
            print(f"해설: {q.explanation}")
            print(f"청크 IDs: {q.chunk_ids}")
            print("-" * 80)

        # JSON 파일로 저장
        output_file = "generation.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(
                [q.to_dict() for q in questions],
                f,
                ensure_ascii=False,
                indent=2
            )
        print(f"\n결과가 {output_file}에 저장되었습니다.")

    except Exception as e:
        print(f"\n   [실패] 오류 발생: {e}")
        import traceback

        traceback.print_exc()
