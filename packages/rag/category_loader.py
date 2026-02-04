from dataclasses import dataclass
from typing import Optional
from db import get_connection, get_cursor
from config import config


@dataclass
class CategoryInfo:
    id: int
    name: str
    path: str
    question_count: int
    unsolved_count: int = 0

    @property
    def needed_count(self) -> int:
        """부족한 문제 수 (threshold - unsolved)"""
        return max(0, config.UNSOLVED_THRESHOLD - self.unsolved_count)


def get_category_path(category_id: int) -> str:
    """재귀 쿼리로 카테고리의 전체 경로를 가져옴"""
    query = """
    WITH RECURSIVE category_path AS (
        SELECT id, name, parent_id, name::text as path
        FROM categories
        WHERE id = %s

        UNION ALL

        SELECT c.id, c.name, c.parent_id, c.name || ' > ' || cp.path
        FROM categories c
        INNER JOIN category_path cp ON c.id = cp.parent_id
    )
    SELECT path FROM category_path
    WHERE parent_id IS NULL
    """
    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query, (category_id,))
            result = cursor.fetchone()
            return result["path"] if result else ""


def get_leaf_category_with_least_questions() -> Optional[CategoryInfo]:
    """문제 수가 가장 적은 leaf 카테고리 중 하나를 랜덤 선정"""
    query = """
    WITH min_count AS (
        SELECT MIN(question_count) as min_q
        FROM categories
        WHERE is_leaf = TRUE AND status = 'active'
    )
    SELECT c.id, c.name, c.question_count
    FROM categories c, min_count mc
    WHERE c.is_leaf = TRUE AND c.status = 'active'
      AND c.question_count = mc.min_q
    ORDER BY RANDOM()
    LIMIT 1
    """
    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query)
            result = cursor.fetchone()

            if not result:
                return None

            path = get_category_path(result["id"])

            return CategoryInfo(
                id=result["id"],
                name=result["name"],
                path=path,
                question_count=result["question_count"]
            )


def get_total_unsolved_count() -> int:
    """전체 unsolved 문제 수 조회"""
    query = """
    SELECT COUNT(*) as unsolved
    FROM questions
    WHERE usage_count = 0 AND is_active = true
    """
    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query)
            result = cursor.fetchone()
            return result["unsolved"] if result else 0


def get_questions_to_generate() -> int:
    """생성해야 할 문제 수 계산

    Returns:
        생성할 문제 수 (threshold - 전체 unsolved, 최소 0)
    """
    total_unsolved = get_total_unsolved_count()
    return max(0, config.UNSOLVED_THRESHOLD - total_unsolved)


def get_categories_for_generation() -> list[CategoryInfo]:
    """문제 생성 대상 카테고리 목록 조회

    우선순위:
    1. 문제가 아예 없는 카테고리 (question_count = 0)
    2. unsolved가 가장 적은 카테고리

    Returns:
        카테고리 목록 (우선순위순 정렬)
    """
    query = """
    SELECT
        c.id,
        c.name,
        c.question_count as total,
        COUNT(CASE WHEN q.usage_count = 0 AND q.is_active = true THEN 1 END) as unsolved
    FROM categories c
    LEFT JOIN category_questions cq ON c.parent_id = cq.category_id
    LEFT JOIN questions q ON cq.question_id = q.id
    WHERE c.is_leaf = TRUE AND c.status = 'active'
    GROUP BY c.id, c.name, c.question_count
    ORDER BY
        CASE WHEN c.question_count = 0 THEN 0 ELSE 1 END,  -- 문제 없는 카테고리 우선
        unsolved ASC  -- unsolved 적은 순
    """
    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query)
            results = cursor.fetchall()

            categories = []
            for row in results:
                path = get_category_path(row["id"])
                categories.append(CategoryInfo(
                    id=row["id"],
                    name=row["name"],
                    path=path,
                    question_count=row["total"],
                    unsolved_count=row["unsolved"]
                ))

            return categories


def get_all_leaf_categories_stats() -> list[dict]:
    """모든 leaf 카테고리의 문제 수 통계 조회 (검증용)"""
    query = """
    SELECT id, name, question_count
    FROM categories
    WHERE is_leaf = TRUE AND status = 'active'
    ORDER BY question_count ASC, name ASC
    """
    with get_connection() as conn:
        with get_cursor(conn) as cursor:
            cursor.execute(query)
            return list(cursor.fetchall())
