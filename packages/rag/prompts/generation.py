"""문제 생성 메인 프롬프트"""

from .multiple_choice import MULTIPLE_CHOICE_PROMPT
from .short_answer import SHORT_ANSWER_PROMPT
from .essay import ESSAY_PROMPT

GENERATION_PROMPT = """## 문제 생성 요청

### 카테고리 정보
- **카테고리명**: {category_name}
- **카테고리 경로**: {category_path}

### 사용 가능한 청크 ID 목록
{chunk_id_list}

### 제공된 청크
{chunks}

---

## 생성 요구사항

### 문제 수 및 구성
- **목표: 10개** (가능한 한 10개에 가깝게 생성하세요)
- 최소 5개 이상, 최대 10개
- 문제 유형 비율 (대략적으로):
  - 객관식 (multiple_choice): 40%
  - 단답형 (short_answer): 30%
  - 서술형 (essay): 30%
- 난이도 비율 (대략적으로):
  - 레벨 1 (기초): 50%
  - 레벨 2 (중급): 30%
  - 레벨 3 (심화): 20%

### 문제 수량 극대화 전략 (중요)
- **문제를 하나 만들었다면, 같은 개념으로 다른 유형의 문제도 출제할 수 있는지 검토하세요**
  - 예시: "TCP의 특징"에 대한 객관식 문제를 만들었다면:
    - 단답형으로도 출제 가능한가? → "TCP가 제공하는 두 가지 주요 서비스는?"
    - 서술형으로도 출제 가능한가? → "TCP와 UDP의 차이점을 설명하시오"
- 모든 문제에 대해 "이 개념을 다른 유형으로도 낼 수 있는가?"를 자문하세요
- 난이도를 달리하여 같은 주제를 다양하게 출제하세요

### 필수 규칙

1. **청크 기반 문제만 생성 (가장 중요)**
   - 반드시 제공된 청크 내용에서만 문제를 출제하세요
   - 청크에 없는 내용을 추측하거나 외부 지식을 사용하면 안 됩니다
   - 외부 지식을 사용한 문제는 무효 처리됩니다

2. **청크 ID 규칙 (필수)**
   - chunk_ids에는 위에 명시된 청크 ID 목록({chunk_id_list})에서만 사용하세요
   - 존재하지 않는 청크 ID를 사용하면 안 됩니다
   - 여러 청크를 참조한 경우 모두 기록하세요

3. **카테고리 관련성**
   - 카테고리({category_name})와 관련된 내용만 문제로 출제하세요
   - 카테고리와 관련 없는 청크 내용은 무시해도 됩니다

4. **중복 방지**
   - 완전히 동일한 질문 텍스트는 출제하지 마세요
   - **같은 개념을 다른 유형/난이도로 출제하는 것은 적극 권장됩니다**

5. **객관식 정답 일치**
   - 객관식 문제의 answer 필드는 options[correct_index]와 정확히 동일해야 합니다

---

{multiple_choice_rules}

{short_answer_rules}

{essay_rules}
"""


def build_generation_prompt(
    category_name: str,
    category_path: str,
    chunks: list[tuple[int, str]],  # [(chunk_id, chunk_content), ...]
) -> str:
    """문제 생성 프롬프트 빌드

    Args:
        category_name: 카테고리명
        category_path: 카테고리 경로 (예: "네트워크 > TCP/IP > 연결 관리")
        chunks: (청크 ID, 청크 내용) 튜플 리스트

    Returns:
        완성된 프롬프트 문자열
    """
    # 청크 ID 목록
    chunk_ids = [chunk_id for chunk_id, _ in chunks]
    chunk_id_list = ", ".join(str(cid) for cid in chunk_ids)

    # 청크 포맷팅
    chunks_text = "\n\n".join(
        f"[청크 ID: {chunk_id}]\n{content}" for chunk_id, content in chunks
    )

    return GENERATION_PROMPT.format(
        category_name=category_name,
        category_path=category_path,
        chunk_id_list=chunk_id_list,
        chunks=chunks_text,
        multiple_choice_rules=MULTIPLE_CHOICE_PROMPT,
        short_answer_rules=SHORT_ANSWER_PROMPT,
        essay_rules=ESSAY_PROMPT,
    )
