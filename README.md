<div align="center">
  <img width="1392" height="768" alt="Gemini Generated Image from Pixelcut" src="https://github.com/user-attachments/assets/6e46624b-d571-4ce3-88df-9cd4336113a3" />

# CS Arena

**CS 학습을 게임처럼, 실력은 면접처럼!** ⚔️

[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white)](https://www.langchain.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

**[📖 프로젝트 위키](https://github.com/boostcampwm2025/web05-boostcamp/wiki)** 

</div>

<br />

## 💫 Background & Problem

> [!IMPORTANT]
> **"CS 이론, 외웠는데 막상 면접에서 말로 설명하려니 막막했던 적 없으신가요?"**
>
> CS 학습의 가장 큰 장벽은 지식의 부족이 아닌 **지루함과 낮은 몰입도**입니다.

**1. 혼자 하는 CS 공부의 한계**

CS 이론 학습은 개발자에게 필수이지만, 대부분의 사람들은 지루함과 낮은 몰입도로 꾸준함을 이어가기 어렵습니다. 특히 혼자 공부할 때는 **개념을 제대로 이해하고 있는지 확인하기 어렵고**, 면접처럼 시간 압박 속에서 말로 설명하는 연습이 포함되지 않는 경우가 많습니다.

**2. 신뢰할 수 없는 학습 자료**

AI 기반 학습 도구가 늘어나고 있지만, 환각(Hallucination) 현상으로 인해 **부정확한 정보를 학습하게 될 위험**이 있습니다. CS 면접 대비에서 부정확한 지식은 치명적입니다.

<br />

## 🎯 Core Solution & Values

<div align="center">
  <strong>CS Arena는 실시간 1:1 대결과 RAG 기반 문제 출제를 결합하여<br/>학습 동기와 신뢰도를 동시에 해결합니다.</strong>

  <br />
  <br />

  <!-- 핵심 솔루션 이미지 추가 필요 -->
  <!-- <img width="800" alt="Core Solution" src="이미지_URL" /> -->
</div>

| 핵심 가치 | 설명 |
|:---:|:---|
| **🎮 학습 지속성** | 1:1 대결 구조와 티어/리더보드를 통해 경쟁심과 성취감을 자극하여 자발적인 반복 학습을 유도합니다. |
| **📚 학습 신뢰도** | RAG(Retrieval-Augmented Generation) 기반으로 검증된 문서에서 문제를 출제하고, 채점 근거를 함께 제공합니다. |
| **⏱️ 실전 면접 대비** | 제한 시간 내 답변하는 환경을 통해 실제 기술 면접과 유사한 압박감 속에서 지식을 꺼내 쓰는 훈련을 합니다. |

<br />

## ✨ 주요 기능 (Key Features)

### ⚔️ 실시간 1:1 대전

- 실력 기반 매칭으로 비슷한 수준의 상대와 대결
- 제한 시간 내 CS 문제를 풀며 실시간 점수 경쟁
- 짧은 플레이 타임으로 반복 참여 유도

### 📝 싱글플레이

- 원하는 카테고리(OS, 네트워크, 자료구조, DB 등) 선택하여 학습
- 부담 없는 환경에서 자기주도 학습
- 대전 전 충분한 연습 가능

### 🏆 티어 & 리더보드

- 브론즈 ~ 다이아 티어 시스템
- 학습 활동과 대전 승패에 따른 점수 산정
- 리더보드를 통한 순위 경쟁

### 📚 문제 은행

- 풀었던 문제 자동 저장 및 관리
- 카테고리, 오답 여부, 북마크로 필터링
- 내 답안, 모범 답안, 채점 근거 및 피드백 확인

<br />

## 🔧 기술적 특징 (Technical Highlights)

> 단순 구현에 그치지 않고, 실제 운영 환경에서 발생하는 분산 시스템 문제를 직접 측정하고 해결했습니다.
> 상세 내용은 [프로젝트 위키](https://github.com/boostcampwm2025/web05-boostcamp/wiki)에서 확인할 수 있습니다.

<br />

### 1. 수평 확장 가능한 분산 실시간 서버

> "상태 있는 WebSocket 서버를 어떻게 수평 확장할 것인가?" — 이 질문에 4가지 패턴으로 답합니다.

단일 인스턴스에서만 동작하는 WebSocket 서버를 **ECS Fargate 다중 인스턴스 환경**에서도 정확히 동작하도록 재설계했습니다.

| 문제 | 해결책 | 근거 |
|:---|:---|:---|
| 인스턴스 간 이벤트 전달 불가 | **Socket.IO Redis Adapter** | sticky session 없이 stateless 수평 확장 |
| 다중 인스턴스 중복 매칭 | **Redis Lua 원자 스크립트** | 분산 환경 race condition 완전 차단 |
| 크로스 인스턴스 게임 커맨드 라우팅 | **GameCommandBus (Redis Pub/Sub)** | 게임 상태 소유 인스턴스에 정확히 전달 |
| BullMQ 라운드 타이머 중복 실행 | **Job ID 기반 dedup** | 재시작·재연결 시 타이머 중복 방지 |

<br />

**k6 부하 테스트 실측 결과:**

| 검증 항목 | 결과 |
|:---|:---|
| 크로스 인스턴스 이벤트 전달률 | **100%** (round_start_received_rate) |
| 100명 동시 매칭 race condition | **0건** (actual_pairs = expected_pairs) |
| BullMQ 라운드 타이머 중복 | **0건** (14,851 이벤트 분석) |
| Scale-in 중 게임 에러율 | **0%** (56게임 동시 진행 중 ECS drain) |
| ECS 신규 태스크 기동 ~ ALB 정상화 | **약 90초** (PENDING 20s → RUNNING 60s → HEALTHY 90s) |

[→ 상세 내용 보기](https://github.com/boostcampwm2025/web05-boostcamp/wiki)

<br />

### 2. RAG 기반 문제 출제 및 채점

```
📄 문서 검색(pgvector) → 🔍 HyDE 쿼리 확장 → 📊 Reranker → 🤖 HyperCLOVA X 생성 → ✅ Gemini 후처리
```

- **HyDE(Hypothetical Document Embeddings)** 로 검색 정확도 향상
- **Clova Reranker** 로 검색 결과 재순위화하여 관련성 높은 문서 우선 선택
- 채점 시 모범답안뿐만 아니라 **채점 기준과 피드백**을 함께 제공
- **RAGAS** 기반 faithfulness · answer_relevancy · context_recall 정량 평가

[→ RAG 파이프라인 상세](https://github.com/boostcampwm2025/web05-boostcamp/wiki)

<br />

### 3. 성능 최적화

**리더보드 쿼리 최적화**
- 전체 랭킹 조회 시 발생하는 N+1 문제 분석 및 인덱스 설계
- `pg_stat_statements` 기반 슬로우 쿼리 탐지 → 실행 계획(EXPLAIN ANALYZE) 분석 → 인덱스 추가

**BullMQ 워커 최적화**
- 채점 Job 병렬 처리 및 재시도 전략 설계
- 중복 Job 방지로 불필요한 외부 API 호출 차단

**OAuth 흐름 최적화**
- Passport.js 기반 GitHub OAuth 흐름 개선 및 토큰 갱신 처리

[→ 성능 최적화 상세](https://github.com/boostcampwm2025/web05-boostcamp/wiki)

<br />

### 4. CI/CD 및 인프라 자동화

- **GitHub Actions** 기반 PR 단위 빌드·테스트·배포 파이프라인
- **ECS Fargate** Auto Scaling: CPU 기반 Target Tracking (ScaleOut 60s / ScaleIn 300s cooldown)
- **Amazon ECR** 이미지 레지스트리 + **ALB** 기반 트래픽 분산
- **Prometheus + Grafana** 실시간 모니터링 (WebSocket 연결 수, BullMQ 큐 상태, 게임 세션 수)

<br />

## 🛠 기술 스택 (Tech Stack)

| Category | Technology |
|:---------|:-----------|
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) |
| **Backend** | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?logo=typeorm&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) |
| **RAG Pipeline** | ![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white) ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white) ![pgvector](https://img.shields.io/badge/pgvector-4169E1?logo=postgresql&logoColor=white) |
| **AI/LLM** | ![Naver Cloud](https://img.shields.io/badge/Clova_Studio-03C75A?logo=naver&logoColor=white) ![Google](https://img.shields.io/badge/Gemini-4285F4?logo=google&logoColor=white) |
| **Infra & DevOps** | ![AWS](https://img.shields.io/badge/AWS_ECS_Fargate-FF9900?logo=aws&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white) ![NCP](https://img.shields.io/badge/NCP-03C75A?logo=naver&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white) |
| **Auth** | ![Passport](https://img.shields.io/badge/Passport-34E27A?logo=passport&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white) ![GitHub OAuth](https://img.shields.io/badge/GitHub_OAuth-181717?logo=github&logoColor=white) |
| **Monorepo** | ![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white) |

<br />

## 🏗️ 인프라 아키텍처 (Infrastructure Architecture)

![인프라 아키텍처](https://github.com/user-attachments/assets/dc853761-384d-4276-b9bd-7b21188f9e10)


<br />

## 🔄 CI/CD 파이프라인 (CI/CD Pipeline)

![CI/CD 파이프라인](https://github.com/user-attachments/assets/b3dda18a-1fae-433a-869a-cf8ae46f80e3)


<br />

## 👥 팀 소개 (Meet Our Team)

<!-- 팀명/팀 소개 추가 필요 -->

> **"작지만 실제로 동작하는 서비스"** 를 목표로,
> 사용자 경험을 최우선으로 생각하며 개발합니다.

<div align="center">

|                       [박수완](https://github.com/PSW99)                       |                         [박영준](https://github.com/NAKTA-Y)                         |                          [황재호](https://github.com/woghrk12)                          |                         [김민우](https://github.com/MINU234)                         |                       [최재영](https://github.com/Enble)                       |
|:---------------------------------------------------------------------------:|:---------------------------------------------------------------------------------:|:------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------:|:---------------------------------------------------------------------------:|
| [![PSW99](https://github.com/PSW99.png?size=100)](https://github.com/PSW99) | [![NAKTA-Y](https://github.com/NAKTA-Y.png?size=400)](https://github.com/NAKTA-Y) | [![woghrk12](https://github.com/woghrk12.png?size=100)](https://github.com/woghrk12) | [![MINU234](https://github.com/MINU234.png?size=100)](https://github.com/MINU234) | [![Enble](https://github.com/Enble.png?size=100)](https://github.com/Enble) |

</div>

<br />

<div align="center">

  ### CS Arena와 함께 즐겁게 CS를 마스터하세요! 🎮

  질문이나 피드백은 언제나 환영합니다.

</div>
