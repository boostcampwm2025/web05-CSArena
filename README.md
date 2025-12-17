# web05-boostcamp

React + NestJS 모노레포 프로젝트

## 프로젝트 구조

```
web05-boostcamp/
├── packages/
│   ├── frontend/              # React 프론트엔드 (Vite)
│   │   ├── src/
│   │   │   ├── lib/          # 유틸리티 함수
│   │   │   ├── main.tsx      # 진입점
│   │   │   ├── App.tsx       # 루트 컴포넌트
│   │   │   ├── index.css     # 글로벌 스타일
│   │   │   └── vite-env.d.ts
│   │   ├── public/           # 정적 파일
│   │   ├── index.html        # HTML 템플릿
│   │   ├── components.json   # shadcn/ui 설정
│   │   ├── tailwind.config.js # Tailwind CSS 설정
│   │   ├── postcss.config.js # PostCSS 설정
│   │   ├── vite.config.ts    # Vite 설정
│   │   ├── tsconfig.json     # TypeScript 설정
│   │   └── package.json
│   │
│   └── backend/               # NestJS 백엔드
│       ├── src/
│       │   ├── main.ts       # 진입점
│       │   ├── app.module.ts # 루트 모듈
│       │   ├── app.controller.ts
│       │   └── app.service.ts
│       ├── test/             # E2E 테스트
│       ├── nest-cli.json     # NestJS CLI 설정
│       ├── tsconfig.json     # TypeScript 설정
│       └── package.json
│
├── .gitignore
├── package.json              # 루트 package.json
├── pnpm-workspace.yaml       # pnpm workspace 설정
├── tsconfig.base.json        # 공통 TypeScript 설정
└── README.md

## 기술 스택

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS v3
- shadcn/ui
- ESLint

### Backend
- NestJS 10
- TypeScript
- Jest

### 모노레포 관리
- pnpm workspace

## 시작하기

### 사전 요구사항
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 설치

```bash
# pnpm 설치 (전역)
npm install -g pnpm

# 의존성 설치
pnpm install
```

### 개발 서버 실행

```bash
# 모든 패키지 개발 서버 동시 실행
pnpm dev

# 개별 패키지 실행
pnpm --filter @web05-boostcamp/frontend dev
pnpm --filter @web05-boostcamp/backend dev
```

### 빌드

```bash
# 모든 패키지 빌드
pnpm build

# 개별 패키지 빌드
pnpm --filter @web05-boostcamp/frontend build
pnpm --filter @web05-boostcamp/backend build
```

### 테스트

```bash
# 모든 패키지 테스트
pnpm test

# 개별 패키지 테스트
pnpm --filter @web05-boostcamp/backend test
```

### Lint

```bash
# 모든 패키지 lint
pnpm lint
```

## 포트 설정

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

Frontend에서 `/api` 경로로 요청 시 자동으로 Backend로 프록시됩니다.

## 개발 가이드

### 새로운 패키지 추가

1. `packages/` 디렉토리에 새 패키지 생성
2. `package.json`의 name을 `@web05-boostcamp/패키지명` 형식으로 설정
3. 루트에서 `pnpm install` 실행

### 패키지 간 의존성 추가

```bash
# frontend에서 backend 모듈 사용하기
cd packages/frontend
pnpm add @web05-boostcamp/backend
```

### 외부 패키지 추가

```bash
# 특정 패키지에 의존성 추가
pnpm --filter @web05-boostcamp/frontend add 패키지명
pnpm --filter @web05-boostcamp/backend add 패키지명

# 개발 의존성 추가
pnpm --filter @web05-boostcamp/frontend add -D 패키지명
```

### shadcn/ui 컴포넌트 추가

```bash
# frontend 디렉토리로 이동
cd packages/frontend

# 원하는 컴포넌트 추가
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
# ... 기타 컴포넌트
```