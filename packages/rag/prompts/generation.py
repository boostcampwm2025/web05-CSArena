"""문제 생성 메인 프롬프트"""
from .multiple_choice import MULTIPLE_CHOICE_PROMPT
from .short_answer import SHORT_ANSWER_PROMPT
from .essay import ESSAY_PROMPT

GENERATION_PROMPT = """
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

### 1. 문제 수량 (필수: 정확히 10개)
- **반드시 10개의 문제를 생성하세요.**
- 어떤 경우에도 10개 미만으로 생성하지 마세요.
- **수량 확보 전략**:
  1. **유형 변형**: 하나의 개념을 객관식, 단답형, 서술형으로 각각 만드세요.
     - 예: "TCP 3-way handshake" -> (1) 순서 묻기(객관식), (2) 단계별 패킷명 묻기(단답형), (3) 신뢰성 보장 원리 묻기(서술형)
  2. **관점 다각화**: 정의, 특징, 장단점, 사용 사례, 타 기술과의 비교 등 다양한 각도에서 질문하세요.
  3. **세부 내용 활용**: 청크의 구석구석에 있는 세부적인 내용도 문제로 만드세요.

### 2. 언어 규칙 (필수: 한국어)
- **모든 텍스트(질문, 정답, 해설, 선택지)는 한국어로 작성하세요.**
- IT 기술 용어(영어 단어)는 원어 그대로 사용하세요. (예: process, thread, API)
- 문장 전체가 영어가 되어서는 안 됩니다.

### 문제 유형 및 난이도 구성
- 유형 비율: 객관식(40%), 단답형(30%), 서술형(30%) - *최대한 맞추되, 10개를 채우는 것이 최우선입니다.*
- 난이도 비율: 기초(50%), 중급(30%), 심화(20%)

### 필수 규칙

1. **청크 기반 문제만 생성 (가장 중요)**
   - 반드시 제공된 청크 내용에서만 문제를 출제하세요.
   - 청크에 없는 내용을 추측하거나 외부 지식을 사용하면 안 됩니다.

2. **청크 ID 규칙 (필수)**
   - chunk_ids에는 위에 명시된 청크 ID 목록({chunk_id_list})에서만 사용하세요.
   - 존재하지 않는 청크 ID를 사용하면 안 됩니다.

3. **중복 방지**
   - 완전히 동일한 질문 텍스트는 출제하지 마세요.
   - **같은 개념을 다른 유형/난이도로 출제하는 것은 적극 권장됩니다.**

4. **객관식 정답 일치**
   - 객관식 문제의 answer 필드는 options[correct_index]와 정확히 동일해야 합니다.
   - **선택지(options)도 반드시 한국어로 작성하세요.** (용어 제외)

5. **금지 표현 (절대 사용 금지)**
   - 문제, 해설, 선택지, 답변에 다음 표현을 절대 사용하지 마세요:
     - **"청크", "ID", "번", "문서", "그림", "위 내용", "제공된 내용", "텍스트에 따르면"**
     - **"[ID: 123]", "123번에 따르면", "청크 101에서"** 등 출처를 암시하는 모든 표현
     - "위에서 설명한", "주어진 자료", "해당 자료"
   - 실제 면접에서 면접관이 직접 질문하고 설명하는 것처럼 자연스럽게 작성하세요.

6. **해설 품질 (매우 중요)**
   - 해설은 반드시 청크 내용을 근거로 작성하세요.
   - 단순히 "정답은 ~이다"가 아닌, **왜 그런지 이유를 충분히 설명**하세요.
   - 2-4문장으로 개념의 핵심을 짚어주세요.

---

{multiple_choice_rules}

{short_answer_rules}

{essay_rules}

** 다시 한번 강조합니다: 반드시 한국어로 정확히 10개의 문제를 생성하세요. **
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