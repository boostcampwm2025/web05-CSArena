"""문제 DB 저장 모듈"""

import json
import re
from psycopg2.extras import execute_values
from db import get_connection


# question_type 매핑
TYPE_MAP = {
    "multiple_choice": "multiple",
    "short_answer": "short",
    "essay": "essay",
}

# correct_index → 알파벳 매핑
INDEX_TO_LETTER = ["A", "B", "C", "D"]


def calculate_quality_score(faithfulness: float, answer_relevancy: float) -> int:
    """품질 점수 계산 (faithfulness 70%, answer_relevancy 30%)"""
    return int((faithfulness * 0.7 + answer_relevancy * 0.3) * 100)


def clean_option_text(text: str) -> str:
    """옵션 텍스트에서 불필요한 접두사 제거 (예: 'A. 옵션' -> '옵션')"""
    # 패턴: (알파벳/숫자) + (. 또는 )) + 공백
    # 예: "A. ", "a) ", "1. "
    pattern = r"^([A-Da-d0-9]+)[\.\)]\s*"
    return re.sub(pattern, "", text).strip()


def convert_to_db_format(question: dict) -> dict:
    """파이프라인 문제 형식을 DB 형식으로 변환"""
    q_type = TYPE_MAP.get(question["question_type"], question["question_type"])

    # content 변환
    if q_type == "multiple":
        # options: ["출발지 주소", "목적지 주소", ...] → {"A": "출발지 주소", "B": "목적지 주소", ...}
        options = question.get("options", [])
        options_dict = {}
        for i, opt in enumerate(options):
            if i < 4:
                # 옵션 텍스트 정제 적용
                cleaned_opt = clean_option_text(opt)
                options_dict[INDEX_TO_LETTER[i]] = cleaned_opt

        content = {
            "question": question["question"],
            "options": options_dict
        }

        # correct_answer: index → letter
        correct_index = question.get("correct_index", 0)
        correct_answer = INDEX_TO_LETTER[correct_index] if correct_index < 4 else "A"
    else:
        # short, essay: 문자열
        content = question["question"]
        correct_answer = question["answer"]

    # quality_score 계산
    scores = question.get("scores", {})
    faithfulness = scores.get("faithfulness", 0)
    answer_relevancy = scores.get("answer_relevancy", 0)
    quality_score = calculate_quality_score(faithfulness, answer_relevancy)

    return {
        "question_type": q_type,
        "content": content,
        "correct_answer": correct_answer,
        "explanation": question.get("explanation", ""),
        "difficulty": question.get("difficulty", 1),
        "quality_score": quality_score,
        "model_name": "HCX-007",
    }


def save_questions_to_db(questions: list[dict]) -> list[int]:
    """여러 문제 DB 저장 및 카테고리 question_count 업데이트 (단일 트랜잭션)

    문제 저장, category_questions 매핑, 카테고리 업데이트가 원자적으로 처리됩니다.
    하나라도 실패하면 전체 롤백됩니다.
    """
    if not questions:
        return []

    saved_ids = []
    category_counts = {}  # category_id별 저장 수 카운트
    parent_map = {} # category_id -> parent_id 캐싱
    mappings_to_insert = [] # (parent_id, question_id) 모음

    with get_connection() as conn:
        try:
            with conn.cursor() as cur:
                # 1. 모든 문제 INSERT
                for q in questions:
                    db_format = convert_to_db_format(q)
                    content_json = json.dumps(db_format["content"], ensure_ascii=False)

                    cur.execute("""
                        INSERT INTO questions
                        (question_type, content, correct_answer, explanation, difficulty, quality_score, model_name)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        db_format["question_type"],
                        content_json,
                        db_format["correct_answer"],
                        db_format["explanation"],
                        db_format["difficulty"],
                        db_format["quality_score"],
                        db_format["model_name"],
                    ))
                    question_id = cur.fetchone()[0]
                    saved_ids.append(question_id)

                    # 카테고리 처리
                    cat_id = q.get("category_id")
                    if cat_id:
                        # 1-1. Parent ID 조회 및 매핑 데이터 수집
                        if cat_id not in parent_map:
                            cur.execute("SELECT parent_id FROM categories WHERE id = %s", (cat_id,))
                            result = cur.fetchone()
                            parent_map[cat_id] = result[0] if result else None
                        
                        parent_id = parent_map[cat_id]
                        if parent_id:
                            mappings_to_insert.append((parent_id, question_id))

                        # 1-2. 카테고리별 카운트 누적 (Leaf Category 기준)
                        category_counts[cat_id] = category_counts.get(cat_id, 0) + 1

                # 2. category_questions 일괄 INSERT
                if mappings_to_insert:
                    execute_values(
                        cur,
                        "INSERT INTO category_questions (category_id, question_id) VALUES %s",
                        mappings_to_insert
                    )

                # 3. 카테고리 question_count 업데이트 (Leaf Category)
                for cat_id, count in category_counts.items():
                    cur.execute("""
                        UPDATE categories
                        SET question_count = question_count + %s
                        WHERE id = %s
                    """, (count, cat_id))

                # 4. 모두 성공하면 커밋
                conn.commit()

        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"문제 저장 트랜잭션 실패: {e}") from e

    return saved_ids
