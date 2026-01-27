# 검색 전략 의사결정 문서

## 상황 (Situation)

RAG 파이프라인에서 **취준생/주니어 개발자 대상 면접 질문 생성**을 위한 관련 청크를 검색할 때, 어떤 검색 방식이 가장 적합한지 결정이 필요함.

### 요구사항
- 지엽적인 주제에 대해서도 정확한 청크를 가져와야 함
- 유사도가 높은 관련 문서를 Top-5로 추출
- 일관된 품질의 검색 결과 보장
- **핵심 개념 중심의 청크** (구현 세부사항보다 개념 설명 우선)
- **비용 효율성** (API 호출, 토큰 비용 최소화)

---

## 옵션 (Options)

| # | 방법 | 설명 | LLM 호출 |
|---|------|------|----------|
| 1 | **HyDE + Vector** | HCX-007로 검색 최적화 쿼리 생성 → 임베딩 → 벡터 유사도 검색 | 1회 |
| 2 | **Category Direct + Vector** | 카테고리명+경로 직접 임베딩 → 벡터 유사도 검색 | 0회 |
| 3 | **Hybrid (Category Name)** | HyDE 벡터 + 카테고리명 tsvector 매칭 (7:3) | 1회 |
| 4 | **Hybrid (HyDE Keywords)** | HyDE 벡터 + HyDE에서 추출한 키워드 tsvector 매칭 (7:3) | 2회 |
| 5 | **Hybrid (HyDE Keywords v2)** | 개선된 키워드 추출 프롬프트 적용 | 2회 |

---

## 테스트 (Test)

### 테스트 카테고리 (지엽적 주제 5개)
1. connection management (TCP 연결 관리)
2. error detection (오류 검출)
3. mac address (MAC 주소)
4. congestion control (혼잡 제어)
5. http status code categories (HTTP 상태 코드)

### 테스트 환경
- 임베딩: Clova Embedding v2
- LLM: HCX-007 (HyDE 생성 및 키워드 추출용)
- Top-K: 5

---

## 결과 (Results)

### 방법별 상세 결과

---

#### 방법 1: HyDE + Vector

| 카테고리 | 평균 유사도 | Top-1 문서 | Top-1 유사도 |
|----------|------------|-----------|-------------|
| connection management | 0.6921 | TCP state-transition diagram | 0.6996 |
| error detection | 0.7512 | Detecting errors is only one part... | 0.8182 |
| mac address | 0.6981 | Access Protocol (MAC) | 0.7158 |
| congestion control | 0.7508 | congestion control more deeply | 0.7767 |
| http status code | 0.6754 | response messages begin with... | 0.7950 |
| **평균** | **0.7135** | | |

---

#### 방법 2: Category Direct + Vector

| 카테고리 | 평균 유사도 | Top-1 문서 | Top-1 유사도 |
|----------|------------|-----------|-------------|
| connection management | 0.6120 | what we call "transport" | 0.6284 |
| error detection | 0.6027 | Detecting errors is only one part... | 0.6266 |
| mac address | 0.5691 | Addresses, classless... | 0.5738 |
| congestion control | 0.6607 | Congestion control and resource... | 0.6883 |
| http status code | 0.5404 | response messages begin with... | 0.5689 |
| **평균** | **0.5970** | | |

---

#### 방법 3: Hybrid (Category Name)

| 카테고리 | 평균 유사도 | Top-1 문서 | Top-1 유사도 |
|----------|------------|-----------|-------------|
| connection management | 0.6416 | Many technologies can be used... | 0.6507 |
| error detection | 0.7629 | Detecting errors is only one part... | 0.8202 |
| mac address | 0.6836 | Access Protocol (MAC) | 0.7213 |
| congestion control | 0.7663 | congestion control more deeply | 0.7975 |
| http status code | 0.6691 | response messages begin with... | 0.7813 |
| **평균** | **0.7047** | | |

---

#### 방법 4: Hybrid (HyDE Keywords)

| 카테고리 | 평균 유사도 | Top-1 문서 | Top-1 유사도 |
|----------|------------|-----------|-------------|
| connection management | 0.6760 | TCP state-transition diagram | 0.6910 |
| error detection | 0.7802 | Detecting errors is only one part... | 0.8216 |
| mac address | 0.6823 | Access Protocol (MAC) | 0.7204 |
| congestion control | **0.8241** | TCP congestion control | **0.8571** |
| http status code | 0.6671 | response messages begin with... | 0.7836 |
| **평균** | **0.7259** | | |

---

### 종합 비교표

| 방법 | connection | error | mac | congestion | http status | **평균** |
|------|------------|-------|-----|------------|-------------|---------|
| **1. HyDE + Vector** ⭐ | 0.6921 | 0.7512 | 0.6981 | 0.7508 | 0.6754 | 0.7135 |
| 2. Category Direct | 0.6120 | 0.6027 | 0.5691 | 0.6607 | 0.5404 | 0.5970 |
| 3. Hybrid (Cat Name) | 0.6416 | 0.7629 | 0.6836 | 0.7663 | 0.6691 | 0.7047 |
| 4. Hybrid (HyDE KW) | 0.6760 | 0.7802 | 0.6823 | 0.8241 | 0.6671 | 0.7259 |

---

### 주요 발견

#### 1. 수치적 성능 (유사도 기준)
- Hybrid (HyDE Keywords v2): **0.7259** (1위)
- HyDE + Vector: **0.7135** (2위, -1.7%)
- Hybrid (Category Name): 0.7047 (3위)
- Category Direct: 0.5970 (4위)

#### 2. 정성적 분석 (청크 내용 기준)
- **HyDE + Vector**: 개념 설명 중심, 취준생/주니어 면접에 적합
- **Hybrid v2**: 구현 세부사항 포함, 시니어/시스템 설계 면접에 적합

#### 3. 비용 효율성
- HyDE + Vector: LLM 1회 호출
- Hybrid 방식: LLM 2회 호출 (HyDE + 키워드 추출)

---

## 결정 (Decision)

### 선택: HyDE + Vector ⭐

### 근거

#### 1. 대상 사용자 특성
취준생/주니어 개발자 면접에서 묻는 질문 유형:
- "TCP 3-way handshake가 무엇인가요?" (개념)
- "혼잡 제어가 왜 필요한가요?" (개념의 필요성)
- "MAC 주소와 IP 주소의 차이점은?" (개념 비교)

**구현 세부사항(CongestionWindow, duplicate ACK 임계값 등)은 시니어/시스템 설계 면접 범위**

#### 2. 청크 품질 비교 (정성 분석)

| 카테고리 | HyDE + Vector | Hybrid v2 |
|----------|--------------|-----------|
| connection management | **4/5 TCP 관련** (3-way handshake, state diagram) | 1/5 TCP 관련 |
| congestion control | 개념 설명 중심 | 구현 세부사항 (CongestionWindow, additive increase) |
| http status code | HTTP 응답 관련 | "failure" 노이즈 청크 포함 |

#### 3. 비용 효율성

| 항목 | HyDE + Vector | Hybrid v2 |
|------|--------------|-----------|
| LLM 호출 | **1회** | 2회 (+100%) |
| 추가 토큰 | **0** | 50-100 토큰/건 |
| 복잡도 | **단순** | 키워드 추출 프롬프트 관리 필요 |

#### 4. 안정성
- 평균 유사도 0.7135 (2위, 1위 대비 -1.7%)
- **모든 카테고리에서 개념 중심 청크 일관 제공**
- connection management에서 압도적 성능 (TCP 관련 4/5)

### 구현 방식

```
1. HyDE Generator로 검색 최적화 쿼리 생성 (LLM 1회)
2. HyDE 쿼리 임베딩 생성 (Clova Embedding API)
3. Vector 유사도 검색으로 Top-K 추출
```

### 대안 검토

| 대안 | 채택 여부 | 이유 |
|------|----------|------|
| Hybrid (HyDE Keywords v2) | 보류 | 유사도 +1.7% 높지만, 구현 세부사항 중심 + LLM 2회 호출 |
| Category Direct + Vector | 기각 | 유사도 낮음 (0.5970), 개념 연결 약함 |
| Hybrid (Category Name) | 기각 | connection management에서 청크 품질 낮음 |

### 비용 절감 효과
- LLM 호출 1회 절감 (Hybrid 대비)
- 예상 절감: 50-100 토큰/건 × 문제 생성 횟수

---

## 부록 A: connection management 청크 비교

### HyDE + Vector (채택)
1. **3-way handshake timeline** - TCP 연결 수립 과정 ✓
2. **TCP state-transition diagram** - 상태 전이 다이어그램 ✓
3. **TCP connection begins with client** - 클라이언트 연결 시작 ✓
4. **State transition triggers** - 상태 전이 트리거 ✓
5. QUIC protocol - 관련성 낮음

### Hybrid v2
1. TCP connection begins - TCP 관련 ✓
2. Network interfaces design - 관련성 낮음
3. Network security requirement - 관련성 낮음
4. Technologies for computer connection - 일반적
5. Network management problem - 관련성 낮음

**→ HyDE + Vector가 TCP 핵심 개념 4/5개로 압도적 우위**

---

## 부록 B: 면접 질문 유형과 청크 적합성

| 면접 대상 | 질문 유형 | 적합한 방법 |
|-----------|----------|-------------|
| 취준생/주니어 | "~가 무엇인가요?" | HyDE + Vector |
| 취준생/주니어 | "~의 원리를 설명하세요" | HyDE + Vector |
| 시니어/시스템 설계 | "~를 구현할 때 고려사항은?" | Hybrid v2 |
| 시니어/시스템 설계 | "~의 내부 동작을 설명하세요" | Hybrid v2 |

---

## 실험 정보

- 실험 일시: 2026-01-18
- 결과 파일: `retrieval_experiment_results.json`
- 실험 스크립트: `retrieval_comparison.py`
- 비교 방법: 5개 (HyDE+Vector, Category Direct, Hybrid Category, Hybrid HyDE KW, Hybrid HyDE KW v2)
