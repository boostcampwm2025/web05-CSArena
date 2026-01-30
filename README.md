<div align="center">
  <!-- 배너 이미지 추가 필요 -->
  <!-- <img width="1000" alt="banner" src="배너_이미지_URL" /> -->

# CS 아레나

**CS 학습을 게임처럼, 실력은 면접처럼!** ⚔️

[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white)](https://www.langchain.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

**[📖 프로젝트 위키](https://github.com/boostcampwm2025/web05-boostcamp/wiki)** &nbsp; | &nbsp; **[🚀 라이브 데모](https://cs-arena.site)**

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
  <strong>CS 배틀 아레나는 실시간 1:1 대결과 RAG 기반 문제 출제를 결합하여<br/>학습 동기와 신뢰도를 동시에 해결합니다.</strong>

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

### 1. RAG 기반 문제 출제 및 채점

```
📄 문서 검색 → 🤖 문제/모범답안 생성 → ✅ 채점 및 피드백
```

- **LangChain + pgvector**를 활용한 문서 검색 파이프라인
- 검증된 CS 문서 기반으로 환각 현상 최소화
- 채점 시 모범답안뿐만 아니라 **채점 기준과 피드백**을 함께 제공
- **RAGAS**를 활용한 RAG 파이프라인 품질 평가

### 2. 실시간 매칭 시스템

- **Socket.io** 기반 실시간 양방향 통신
- 티어 기반 매칭 + 대기 시간에 따른 범위 확장
- 매칭 품질 로그로 공정성 검증 가능

### 3. WebSocket 기반 실시간 대전

- 라운드별 문제 출제 및 답안 제출
- 실시간 점수 업데이트 및 결과 동기화
- 연결 끊김 시 재연결 처리

<br />

## 🛠 기술 스택 (Tech Stack)

| Category | Technology |
|:---------|:-----------|
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) |
| **Backend** | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?logo=typeorm&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) |
| **RAG Pipeline** | ![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white) ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white) ![pgvector](https://img.shields.io/badge/pgvector-4169E1?logo=postgresql&logoColor=white) |
| **AI/LLM** | ![Naver Cloud](https://img.shields.io/badge/Clova_Studio-03C75A?logo=naver&logoColor=white) ![Google](https://img.shields.io/badge/Gemini-4285F4?logo=google&logoColor=white) |
| **Infra & DevOps** | ![NCP](https://img.shields.io/badge/NCP-03C75A?logo=naver&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white) |
| **Auth** | ![Passport](https://img.shields.io/badge/Passport-34E27A?logo=passport&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white) ![GitHub OAuth](https://img.shields.io/badge/GitHub_OAuth-181717?logo=github&logoColor=white) |
| **Monorepo** | ![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white) |

<br />

## 🏗️ 인프라 아키텍처 (Architecture)

<!-- 아키텍처 다이어그램 이미지 추가 필요 -->
<!-- <div align="center">
  <img width="100%" alt="Infrastructure Diagram" src="아키텍처_이미지_URL" />
</div> -->

### 📂 프로젝트 구조

```
web05-boostcamp/
├── packages/
│   ├── frontend/                 # React 프론트엔드 (Vite)
│   │   └── src/
│   │       ├── feature/          # 기능별 모듈 (auth, matching, single-play)
│   │       ├── pages/            # 라우트 페이지 (home, match, problem-bank, ...)
│   │       ├── shared/           # 공용 컴포넌트
│   │       └── lib/              # API 클라이언트, Socket.io
│   │
│   ├── backend/                  # NestJS 백엔드
│   │   └── src/
│   │       ├── auth/             # 인증 (GitHub OAuth, JWT)
│   │       ├── matchmaking/      # 실시간 매칭 시스템
│   │       ├── game/             # 대전 로직 (WebSocket)
│   │       ├── quiz/             # 퀴즈 출제 및 채점 (Clova Studio)
│   │       ├── single-play/      # 싱글플레이 모드
│   │       ├── problem-bank/     # 문제 은행
│   │       ├── tier/             # 티어 시스템
│   │       └── leaderboard/      # 리더보드
│   │
│   └── rag/                      # RAG 파이프라인 (Python)
│       ├── retriever.py          # 문서 검색 (pgvector)
│       ├── question_generator.py # 문제 생성
│       ├── evaluator.py          # RAG 품질 평가 (RAGAS)
│       └── prompts/              # LLM 프롬프트 템플릿
│
├── .github/workflows/            # CI/CD (GitHub Actions)
├── docs/                         # 프로젝트 문서
└── docker-compose.yml            # Docker 환경 설정
```

<br />

## 🚀 Quick Start

### ⚙️ 사전 요구사항

- Node.js 18.0.0+
- pnpm 8.0.0+
- Docker & Docker Compose (선택)

### 🐳 Docker로 실행 (권장)

```bash
# 1. 저장소 클론
git clone https://github.com/boostcampwm2025/web05-boostcamp.git
cd web05-boostcamp

# 2. 환경 변수 설정
cp .env.example .env

# 3. 전체 스택 실행
docker compose up -d

# 4. 서비스 확인
curl http://localhost:4000/api/health  # Backend
open http://localhost                  # Frontend
```

### 💻 로컬 개발 환경

```bash
# 1. 의존성 설치
pnpm install

# 2. 개발 서버 실행 (Frontend + Backend 동시)
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

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

  ### CS 배틀 아레나와 함께 즐겁게 CS를 마스터하세요! 🎮

  질문이나 피드백은 언제나 환영합니다.

  <br />

  **[📖 프로젝트 위키](https://github.com/boostcampwm2025/web05-boostcamp/wiki)** &nbsp; | &nbsp; **[🚀 라이브 데모](https://cs-arena.site)**

  <br />

  Copyright © 2025 **CS 배틀 아레나 Team**. All rights reserved.
</div>
