네, 앞서 논의한 내용을 바탕으로 **HyperCLOVA X(HCX-007)**와 **Clova Embedding v2**를 **RAGAS** 평가 파이프라인에 연동하는 가이드 문서를 작성해 드립니다.

이 가이드는 `langchain-naver` 공식 패키지를 사용하며, **표준 지표(Faithfulness)**와 **주제 적합성(Custom Metric)**을 모두 설정하는 방법을 포함합니다.

---

# RAGAS with HyperCLOVA X 연동 가이드

이 문서는 `langchain-naver` 패키지를 사용하여 Naver Cloud Platform의 HyperCLOVA X 모델을 RAGAS 평가 프레임워크에 연동하는 방법을 설명합니다.

## 1. 사전 준비 (Prerequisites)

필요한 Python 패키지를 설치합니다.

```bash
pip install -qU langchain langchain-naver ragas datasets

```

## 2. 환경 변수 설정

CLOVA Studio API 키를 환경 변수로 설정합니다. 코드에 직접 노출하지 않도록 주의하십시오.

```python
import os

# 시스템 환경 변수에 설정되어 있다면 생략 가능
if "CLOVASTUDIO_API_KEY" not in os.environ:
    os.environ["CLOVASTUDIO_API_KEY"] = "sk-..." # 발급받은 API Key

```

## 3. LangChain 모델 객체 초기화

RAGAS는 LangChain의 `BaseChatModel`과 `Embeddings` 인터페이스를 지원하는 객체를 입력으로 받습니다. `langchain-naver`의 객체를 그대로 사용할 수 있습니다.

```python
from langchain_naver import ChatClovaX, ClovaXEmbeddings

# 1. 평가용 LLM (HCX-007)
# 평가는 일관성이 중요하므로 temperature를 낮게 설정합니다.
evaluator_llm = ChatClovaX(
    model="HCX-007",
    temperature=0.1,
    max_tokens=2048
)

# 2. 임베딩 모델 (Clova Embedding v2)
# RAGAS의 일부 지표(Faithfulness 등) 계산에 필수적입니다.
evaluator_embeddings = ClovaXEmbeddings(
    model="clir-emb-dolphin"
)

```

## 4. 커스텀 메트릭 정의: 주제 적합성 (Topic Adherence)

기본 지표 외에, 생성된 문제가 **"원래 의도한 카테고리 주제에 부합하는지"** 확인하기 위해 `AspectCritique`를 사용합니다.

```python
from ragas.metrics.critique import AspectCritique

# 'ground_truth' 컬럼에 들어있는 '카테고리 경로'와 '질문'을 비교하는 로직
topic_adherence = AspectCritique(
    name="topic_adherence",
    definition="Is the question directly related to the provided technical topic (category)? The question must ask about concepts, mechanisms, or issues within the topic scope.",
    strictness=1,  # 1: 엄격함 (관련 없으면 가차 없이 0점)
    llm=evaluator_llm # 평가 수행 주체로 HCX-007 지정
)

```

## 5. 데이터셋 구성 (Dataset Preparation)

RAGAS 평가를 위해서는 `datasets.Dataset` 포맷이 필요합니다.
특히 **주제 적합성 평가**를 위해 `ground_truth` 필드에 **카테고리 정보**를 주입하는 것이 핵심입니다.

```python
from datasets import Dataset

# 파이프라인에서 생성된 결과 예시 데이터
generated_data = {
    "question": [
        "TCP 3-way handshake의 3단계 과정을 설명하시오.",
        "HTTP 404 Not Found 에러의 의미는 무엇인가?"
    ],
    "answer": [
        "SYN, SYN-ACK, ACK 패킷을 교환하여 연결을 수립합니다...",
        "요청한 리소스를 서버에서 찾을 수 없음을 의미합니다..."
    ],
    "contexts": [
        ["TCP 연결 수립 과정은 SYN으로 시작하여..."],
        ["HTTP 상태 코드 400번대는 클라이언트 에러이며..."]
    ],
    # [중요] 주제 적합성 평가를 위해 정답 대신 '카테고리 경로'를 입력
    "ground_truth": [
        "Network > Transport Layer > TCP Connection",  # 1번 질문: 적합
        "Network > Transport Layer > TCP Connection"   # 2번 질문: 부적합 (HTTP 질문임)
    ]
}

dataset = Dataset.from_dict(generated_data)

```

## 6. 평가 실행 (Running Evaluation)

정의한 모델과 메트릭을 주입하여 평가를 실행합니다.

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevance

# 실행
results = evaluate(
    dataset=dataset,
    metrics=[
        faithfulness,      # 청크 기반 사실성 검증 (임베딩 모델 필요)
        answer_relevance,  # 답변 적절성 검증 (임베딩 모델 필요)
        topic_adherence    # [Custom] 카테고리 주제 적합성 검증
    ],
    llm=evaluator_llm,             # HCX-007
    embeddings=evaluator_embeddings # clir-emb-dolphin
)

# 결과 출력
print(results)
# df = results.to_pandas()
# df.to_csv("evaluation_result.csv")

```

---

## [부록] 전체 코드 (Full Script)

```python
import os
from langchain_naver import ChatClovaX, ClovaXEmbeddings
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevance
from ragas.metrics.critique import AspectCritique
from datasets import Dataset

# 1. API Key 설정
# os.environ["CLOVASTUDIO_API_KEY"] = "sk-..."

# 2. 모델 초기화
clova_llm = ChatClovaX(
    model="HCX-007",
    temperature=0.1
)

clova_embeddings = ClovaXEmbeddings(
    model="clir-emb-dolphin"
)

# 3. 커스텀 메트릭 (카테고리 검증용)
topic_check = AspectCritique(
    name="topic_adherence",
    definition="Is the question directly relevant to the specific technical category provided in the ground_truth? If the question asks about a different protocol or concept, score it 0.",
    strictness=1,
    llm=clova_llm
)

# 4. 데이터 준비 (예시)
data = {
    "question": ["TCP 3-way handshake 과정을 서술하시오."],
    "answer": ["SYN -> SYN-ACK -> ACK 순서로 진행됩니다."],
    "contexts": [["TCP 3-way handshake는 연결 지향 통신을 위해..."]],
    "ground_truth": ["Network > Transport > TCP"] # 카테고리 정보
}
dataset = Dataset.from_dict(data)

# 5. 평가 실행
result = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevance, topic_check],
    llm=clova_llm,
    embeddings=clova_embeddings
)

print(result)

```

## 주요 평가 지표

| **지표 (Metric)**                                  | **비교 대상 (Input Pairs)**                                             | **검증 질문 (Check Point)**                                                           | **비고**                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Faithfulness<br><br> <br><br>(신뢰성/충실도)       | **Answer** vs **Contexts**                                              | "답안이 청크에 있는 내용만으로 작성되었는가?"<br><br> <br><br>(외부 지식/거짓말 탐지) | RAGAS 기본 지표                                         |
| Answer Relevance<br><br> <br><br>(답변 관련성)     | **Question** vs **Answer**                                              | "답안이 질문의 핵심 의도에 맞게 동문서답하지 않는가?"                                 | RAGAS 기본 지표                                         |
| Context Relevance<br><br> <br><br>(문맥 관련성)    | **Question** vs **Contexts**                                            | "질문을 해결하는 데 필요한 정보가 청크에 실제로 포함되어 있는가?"                     | RAGAS 기본 지표                                         |
| Category Consistency<br><br> <br><br>(주제 적합성) | **Question** vs **Category**<br><br> <br><br>(`ground_truth` 필드 활용) | "질문이 우리가 의도한 주제(카테고리)를 벗어나지 않았는가?"                            | **Custom 지표**<br><br> <br><br>(`AspectCritique` 사용) |
