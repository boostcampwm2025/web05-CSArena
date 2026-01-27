# RAG 평가 모델 및 프롬프트 비교 실험 보고서

## 1. 실험 개요

### 1.1 목적
본 실험은 RAG 기반 문제 생성 파이프라인에서 다음 요소들이 평가 점수에 미치는 영향을 분석하기 위해 수행되었습니다:
- 평가 모델 선택 (Gemini-2.0-flash vs HCX-007)
- 데이터 품질 (의도적으로 높은 점수를 받도록 조작한 데이터)
- 프롬프트 전략 (해설 vs 모범답안)

### 1.2 평가 지표
- **Faithfulness**: 생성된 답변이 검색된 문서(retrieved contexts)에 얼마나 충실한가
- **Answer Relevancy**: 생성된 답변이 질문과 얼마나 관련성이 있는가
- **Context Precision**: 검색된 문서가 질문 해결에 얼마나 적절한가 (HCX-007만)

---

## 2. 실험 설계

### Test 1: Gemini-2.0-flash 기본 평가
- **평가 모델**: Gemini-2.0-flash
- **데이터**: HCX-007로 생성한 기본 문제 (10개)
- **프롬프트**: 기존 해설(explanation) 방식

### Test 2: HCX-007 평가
- **평가 모델**: HCX-007
- **데이터**: 동일한 기본 문제 (10개)
- **프롬프트**: 기존 해설(explanation) 방식

### Test 3: 고득점 유도 데이터
- **평가 모델**: Gemini-2.0-flash
- **데이터**: retrieved contexts와 완벽하게 일치하도록 수동 작성한 문제 (5개)
- **특징**: question, answer, explanation이 모두 contexts에서 직접 인용

### Test 4: 모범답안 프롬프트
- **평가 모델**: Gemini-2.0-flash
- **데이터**: HCX-007로 생성한 문제 (10개)
- **프롬프트**: 해설 → 모범답안으로 변경 (1-2문장으로 간결하게)

---

## 3. 실험 결과

### 3.1 전체 결과 요약

| Test | 평가 모델 | 데이터 | Faithfulness | Answer Relevancy | Context Precision |
|------|-----------|--------|--------------|------------------|-------------------|
| Test 1 | Gemini-2.0-flash | 기본 | **0.8333** | **0.7187** | - |
| Test 2 | HCX-007 | 기본 | **0.8944** | **0.9811** | **0.9000** |
| Test 3 | Gemini-2.0-flash | 고득점 | **1.0000** | **0.8437** | - |
| Test 4 | Gemini-2.0-flash | 모범답안 | **0.8500** | **0.6999** | - |

### 3.2 주요 발견사항

#### (1) 평가 모델 간 점수 차이 (Test 1 vs Test 2)

**동일한 데이터에 대한 평가 결과:**
- **Faithfulness**: HCX-007이 Gemini보다 7.3% 높음 (0.8333 → 0.8944)
- **Answer Relevancy**: HCX-007이 Gemini보다 36.5% 높음 (0.7187 → 0.9811)

**분석:**
- HCX-007이 훨씬 관대한 평가를 수행함
- 특히 Answer Relevancy에서 큰 차이 발생
- Gemini가 더 엄격한 평가 기준을 적용하는 것으로 보임

#### (2) 고득점 유도 데이터의 효과 (Test 1 vs Test 3)

**의도적으로 contexts와 일치시킨 결과:**
- **Faithfulness**: 0.8333 → **1.0000** (완벽 달성!)
- **Answer Relevancy**: 0.7187 → 0.8437 (17.4% 향상)

**분석:**
- Faithfulness는 예상대로 완벽하게 1.0 달성
- Answer Relevancy도 향상되었으나 1.0에는 미치지 못함
- 이유: 질문이 영어로 작성되어 직접성이 다소 떨어짐

#### (3) 프롬프트 전략의 영향 (Test 1 vs Test 4)

**해설 → 모범답안 변경 결과:**
- **Faithfulness**: 0.8333 → 0.8500 (2.0% 향상)
- **Answer Relevancy**: 0.7187 → 0.6999 (2.6% 감소)

**분석:**
- Faithfulness는 소폭 향상 (더 간결하고 청크 기반)
- Answer Relevancy는 오히려 감소
- 가능한 원인: 1-2문장으로 제한하면서 질문과의 직접적 연관성이 약화됨

---

## 4. 상세 분석

### 4.1 Faithfulness 분석

**점수 분포:**
```
Test 1 (Gemini, 기본): 0.8333
Test 2 (HCX-007, 기본): 0.8944
Test 3 (Gemini, 고득점): 1.0000 ⭐
Test 4 (Gemini, 모범답안): 0.8500
```

**관찰:**
1. contexts와 완벽하게 일치시키면 1.0 달성 가능
2. 평가 모델에 따라 점수 편차 발생 (0.8333 vs 0.8944)
3. 프롬프트 전략 변경만으로는 큰 차이 없음

### 4.2 Answer Relevancy 분석

**점수 분포:**
```
Test 1 (Gemini, 기본): 0.7187
Test 2 (HCX-007, 기본): 0.9811 ⭐
Test 3 (Gemini, 고득점): 0.8437
Test 4 (Gemini, 모범답안): 0.6999
```

**관찰:**
1. HCX-007이 매우 높은 점수 부여 (0.9811)
2. Gemini는 0.6~0.8 범위로 편차가 큼
3. 모범답안 프롬프트가 오히려 점수 하락

### 4.3 평가 모델 신뢰성 비교

| 기준 | Gemini-2.0-flash | HCX-007 |
|------|------------------|---------|
| 평가 엄격성 | 높음 | 낮음 |
| 점수 일관성 | 중간 (0.6~0.8) | 높음 (0.9 이상) |
| 변별력 | 높음 | 낮음 |
| 신뢰도 | 높음 | 중간 |

**결론:**
- **Gemini-2.0-flash**가 더 신뢰할 수 있는 평가 모델로 판단됨
- 이유: 엄격한 기준, 높은 변별력, 데이터 품질에 민감하게 반응

---

## 5. 결론 및 권장사항

### 5.1 주요 결론

1. **평가 모델 선택이 결과에 큰 영향을 미침**
   - HCX-007은 과도하게 관대한 평가 수행
   - Gemini-2.0-flash가 더 신뢰할 수 있는 평가 제공

2. **데이터 품질이 Faithfulness에 결정적 영향**
   - contexts와의 일치도를 높이면 Faithfulness 1.0 달성 가능
   - Answer Relevancy는 데이터 품질만으로 완벽하게 제어 어려움

3. **프롬프트 전략 변경의 효과는 제한적**
   - "해설" → "모범답안" 변경으로 큰 차이 없음
   - 오히려 Answer Relevancy 감소 가능성

### 5.2 권장사항

#### 평가 단계
- ✅ **Gemini-2.0-flash 사용 권장**
- ❌ HCX-007은 평가용으로 부적합 (너무 관대함)

#### 문제 생성 단계
- ✅ retrieved contexts와의 밀접한 연관성 유지
- ✅ 청크 내용을 명확하게 반영한 답변 생성
- ⚠️ 프롬프트 길이 제한은 신중하게 적용

#### 품질 관리
- Faithfulness 목표: **0.85 이상**
- Answer Relevancy 목표: **0.75 이상**
- 두 지표가 모두 목표치를 만족해야 고품질 문제로 판단

---

## 6. 한계점 및 향후 연구

### 6.1 실험의 한계
- 문제 수가 적음 (각 테스트당 5~10개)
- 단일 카테고리(router concept)에 편중
- Test 3의 고득점 데이터가 영어로 작성됨

### 6.2 향후 연구 방향
1. 더 많은 샘플로 실험 반복
2. 다양한 카테고리에서 일관성 검증
3. 한국어 고득점 데이터로 재실험
4. 다른 평가 모델(GPT-4, Claude 등) 추가 비교
5. Context Precision 지표 활용 방안 연구

---

## 7. 부록: 테스트 파일 목록

### 생성된 파일
- `generation_test1.json` - Test 1 문제 데이터
- `generation_test4.json` - Test 4 문제 데이터 (모범답안)
- `test_high_score.json` - Test 3 고득점 유도 데이터
- `chunks_for_test3.json` - Test 3에 사용된 chunk 원본

### 평가 결과
- `evaluation_test1.csv` - Test 1 결과
- `evaluation_test2.csv` - Test 2 결과
- `evaluation_test3.csv` - Test 3 결과
- `evaluation_test4.csv` - Test 4 결과

### 로그 파일
- `evaluation_test1.log`
- `evaluation_test2.log`
- `evaluation_test3.log`
- `evaluation_test4.log`

---

**실험 수행일**: 2026-01-21
**실험 환경**: HCX-007 (문제 생성), Gemini-2.0-flash / HCX-007 (평가)
**RAGAS 버전**: Latest (as of 2026-01)
