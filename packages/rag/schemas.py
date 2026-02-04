"""RAG 파이프라인 데이터 스키마 정의"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"


class Difficulty(Enum):
    LEVEL_1 = 1  # 매우 쉬움: 단순 정의, 용어
    LEVEL_2 = 2  # 쉬움: 기본 개념 이해
    LEVEL_3 = 3  # 보통: 개념 적용, 비교
    LEVEL_4 = 4  # 어려움: 심화 이해, 분석
    LEVEL_5 = 5  # 매우 어려움: 복합 분석, 설계


@dataclass
class GeneratedQuestion:
    """생성된 문제 스키마"""

    # 기본 정보
    question_type: QuestionType
    difficulty: Difficulty

    # 문제 내용
    question: str

    # 정답 정보
    answer: str  # 단답형/서술형 정답, 객관식은 options[correct_index]
    explanation: str  # 해설

    # 객관식 전용 필드
    options: list[str] = field(default_factory=list)  # 4개 선택지
    correct_index: int = 0  # 정답 인덱스 (0-3)

    # 메타데이터
    category_id: int = 0
    category_name: str = ""
    chunk_ids: list[int] = field(default_factory=list)

    def validate(self) -> tuple[bool, str]:
        """문제 유효성 검증"""
        if not self.question.strip():
            return False, "질문이 비어있습니다"

        if not self.answer.strip():
            return False, "정답이 비어있습니다"

        if self.question_type == QuestionType.MULTIPLE_CHOICE:
            if len(self.options) != 4:
                return False, f"객관식은 4개 선택지 필요 (현재: {len(self.options)}개)"
            if not 0 <= self.correct_index <= 3:
                return False, f"정답 인덱스는 0-3 범위 (현재: {self.correct_index})"
            if any(not opt.strip() for opt in self.options):
                return False, "빈 선택지가 있습니다"

        return True, "OK"

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "question_type": self.question_type.value,
            "difficulty": self.difficulty.value,
            "question": self.question,
            "answer": self.answer,
            "explanation": self.explanation,
            "options": self.options,
            "correct_index": self.correct_index,
            "category_id": self.category_id,
            "category_name": self.category_name,
            "chunk_ids": self.chunk_ids,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "GeneratedQuestion":
        """딕셔너리에서 생성"""
        return cls(
            question_type=QuestionType(data["question_type"]),
            difficulty=Difficulty(data["difficulty"]),
            question=data["question"],
            answer=data["answer"],
            explanation=data.get("explanation", ""),
            options=data.get("options", []),
            correct_index=data.get("correct_index", 0),
            category_id=data.get("category_id", 0),
            category_name=data.get("category_name", ""),
            chunk_ids=data.get("chunk_ids", []),
        )


@dataclass
class QuestionGenerationContext:
    """문제 생성을 위한 컨텍스트"""

    category_id: int
    category_name: str
    category_path: str
    chunks: list[str]  # 청크 내용 목록
    chunk_ids: list[int]  # 청크 ID 목록
    target_question_count: int = 10  # 생성할 문제 수 (기본값 10)

    def get_combined_context(self, separator: str = "\n\n---\n\n") -> str:
        """청크들을 하나의 컨텍스트로 합침"""
        return separator.join(self.chunks)
