"""문제 생성 메인 프롬프트"""
from .multiple_choice import MULTIPLE_CHOICE_PROMPT
from .short_answer import SHORT_ANSWER_PROMPT
from .essay import ESSAY_PROMPT

GENERATION_PROMPT = """
## 타겟 대상 (최우선 확인사항)

**취준생/신입 개발자**를 위한 면접 대비 문제입니다.
- 모든 문제는 취준생/신입이 **면접에서 실제로 받을 수 있는 수준**이어야 합니다.
- 현업 시니어만 아는 심화 지식, 지엽적인 세부사항은 **절대 출제 금지**입니다.

---

## 문제 생성 요청

### 카테고리 정보
- **카테고리명**: {category_name}
- **카테고리 경로**: {category_path}

### 사용 가능한 청크 ID 목록

{chunk_id_list}

### 제공된 청크

{chunks}

---

## 생성 요구사항

### 1. 문제 수량 (필수: 정확히 {target_count}개)
- **반드시 {target_count}개의 문제를 생성하세요.**
- **수량 확보 전략**:
  1. **유형 변형**: 하나의 개념을 객관식, 단답형, 서술형으로 각각 출제
  2. **관점 다각화**: 정의, 특징, 장단점, 사용 사례 등 다양한 각도에서 질문

### 2. 언어 규칙 (필수: 한국어)
- **모든 텍스트(질문, 정답, 해설, 선택지)는 한국어로 작성하세요.**
- IT 기술 용어(예: process, thread, API)는 영어 그대로 사용 가능합니다.

### 3. 문제 유형 비율
- 객관식(40%), 단답형(30%), 서술형(30%)
- *최대한 맞추되, 문제 수를 채우는 것이 최우선입니다.*

### 4. 난이도 구성 (취준생/신입 기준)

**난이도 비율**: 1~2레벨 60%, 3레벨 30%, 4레벨 10%

- **레벨 1 (기초)**: 취준생이 기초 중의 기초로 반드시 알아야 할 개념 정의
  - 예: "TCP란 무엇인가?", "HTTP 상태코드 200의 의미는?"
- **레벨 2 (기본)**: 면접에서 자주 나오는 기본 개념, 간단한 비교
  - 예: "TCP와 UDP의 차이점은?", "프로세스와 스레드의 차이는?"
- **레벨 3 (이해)**: 신입이 실무에서 바로 활용할 수 있는 수준의 원리 이해
  - 예: "3-way handshake 과정을 설명하시오", "인덱스를 사용하는 이유는?"
- **레벨 4 (적용)**: 우수한 신입이 알면 좋은 수준 (드물게 출제)
  - 예: "특정 상황에서 A 대신 B를 선택하는 이유는?"

### 5. 출제 금지 사항
- **지엽적인 세부사항**: 특정 버전, 구현체별 디테일, 암기해야만 아는 숫자/코드
- **시니어 수준 심화**: 복잡한 최적화, 아키텍처 설계 판단, 트레이드오프 심층 분석
- **면접에서 안 나오는 내용**: 실무에서도 거의 쓰이지 않는 레거시 개념

### 6. 문제 생성 전 자가 검증 (필수)

**각 문제를 만들기 전에 반드시 스스로 질문하세요:**

1. "이 내용을 면접관이 취준생/신입에게 실제로 물어볼까?" → 아니오면 출제 금지
2. "이걸 모르면 신입 개발자로서 업무에 문제가 될까?" → 아니오면 출제 금지
3. "이건 암기해야만 알 수 있는 내용인가?" → 예라면 출제 금지

**출제하면 안 되는 문제 예시:**
- ❌ "~의 개수는 몇 개인가?" (암기형 숫자)
- ❌ "초기/역사적으로 사용된 방식은?" (역사적 맥락)
- ❌ "~는 어느 방향으로 처리되는가?" (구현 디테일)
- ❌ "~의 구성 요소가 아닌 것은?" (소거법 암기)

**출제해야 하는 문제 예시:**
- ✅ "~란 무엇인가?" (핵심 개념 정의)
- ✅ "~가 필요한 이유는?" (필요성/목적)
- ✅ "~와 ~의 차이점은?" (기본 비교)
- ✅ "~의 동작 과정을 설명하시오" (핵심 원리)

### 필수 규칙

1. **청크 기반 문제만 생성**
   - 반드시 제공된 청크 내용에서만 문제를 출제하세요.
   - 청크에 없는 내용을 추측하거나 외부 지식을 사용하면 안 됩니다.

2. **청크 ID 규칙**
   - chunk_ids에는 위에 명시된 청크 ID 목록({chunk_id_list})에서만 사용하세요.

3. **중복 방지**
   - 동일한 질문 텍스트는 출제하지 마세요.
   - 같은 개념을 다른 유형/난이도로 출제하는 것은 권장됩니다.

4. **객관식 정답 일치**
   - 객관식 문제의 answer 필드는 options[correct_index]와 정확히 동일해야 합니다.

5. **금지 표현**
   - 문제, 해설, 선택지에 다음 표현을 절대 사용하지 마세요:
     - "청크", "ID", "문서", "위 내용", "제공된 내용", "텍스트에 따르면"
   - 면접관이 직접 질문하는 것처럼 자연스럽게 작성하세요.

6. **해설 품질**
   - 해설은 제공된 청크 내용을 근거로 작성하세요.
   - **왜 그런지 이유를 충분히 설명**하세요. (2-4문장)
   - 출처를 암시하는 표현은 사용하지 마세요.

---

{multiple_choice_rules}

{short_answer_rules}

{essay_rules}

---

**최종 확인**: 모든 문제가 '취준생/신입 개발자'가 면접에서 실제로 받을 수 있는 수준인지 점검하세요.
"""

def build_generation_prompt(
    category_name: str,
    category_path: str,
    chunks: list[tuple[int, str]],  # [(chunk_id, chunk_content), ...]
    target_count: int = 10,
) -> str:
    """문제 생성 프롬프트 빌드

    Args:
        category_name: 카테고리명
        category_path: 카테고리 경로 (예: "네트워크 > TCP/IP > 연결 관리")
        chunks: (청크 ID, 청크 내용) 튜플 리스트
        target_count: 생성할 문제 수 (기본값 10)

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
        target_count=target_count,
        multiple_choice_rules=MULTIPLE_CHOICE_PROMPT,
        short_answer_rules=SHORT_ANSWER_PROMPT,
        essay_rules=ESSAY_PROMPT,
    )