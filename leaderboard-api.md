# 리더보드 API 명세서

## 개요

리더보드 API는 멀티플레이와 싱글플레이의 상위 100명 랭킹과 내 순위를 조회합니다.

## 엔드포인트

```
GET /leaderboard
```

## 인증

| 헤더 | 값 |
|------|-----|
| Authorization | Bearer {access_token} |

## 요청

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| type | enum | O | `multi` (멀티플레이) 또는 `single` (싱글플레이) |

### 요청 예시

```
GET /leaderboard?type=multi
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 응답

### 멀티플레이 (`type=multi`)

```json
{
  "rankings": [
    {
      "nickname": "string",
      "userProfile": "string | null",
      "tierPoint": "number",
      "winCount": "number",
      "loseCount": "number",
      "tier": "string"
    }
  ],
  "myRanking": {
    "rank": "number",
    "nickname": "string",
    "userProfile": "string | null",
    "tierPoint": "number",
    "winCount": "number",
    "loseCount": "number",
    "tier": "string"
  }
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| rankings | array | 상위 100명 랭킹 목록 |
| rankings[].nickname | string | 유저 닉네임 |
| rankings[].userProfile | string \| null | 프로필 이미지 URL |
| rankings[].tierPoint | number | 티어 점수 |
| rankings[].winCount | number | 승리 횟수 |
| rankings[].loseCount | number | 패배 횟수 |
| rankings[].tier | string | 티어 이름 |
| myRanking | object | 내 랭킹 정보 |
| myRanking.rank | number | 내 순위 (1부터 시작) |

#### 티어 기준

| 티어 | tierPoint 범위 |
|------|----------------|
| bronze | 0 ~ 999 |
| silver | 1000 ~ 1499 |
| gold | 1500 ~ 1999 |
| platinum | 2000 ~ 2499 |
| diamond | 2500+ |

---

### 싱글플레이 (`type=single`)

```json
{
  "rankings": [
    {
      "nickname": "string",
      "userProfile": "string | null",
      "expPoint": "number",
      "level": "number",
      "solvedCount": "number",
      "correctCount": "number"
    }
  ],
  "myRanking": {
    "rank": "number",
    "nickname": "string",
    "userProfile": "string | null",
    "expPoint": "number",
    "level": "number",
    "solvedCount": "number",
    "correctCount": "number"
  }
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| rankings | array | 상위 100명 랭킹 목록 |
| rankings[].nickname | string | 유저 닉네임 |
| rankings[].userProfile | string \| null | 프로필 이미지 URL |
| rankings[].expPoint | number | 경험치 |
| rankings[].level | number | 레벨 |
| rankings[].solvedCount | number | 푼 문제 수 |
| rankings[].correctCount | number | 맞춘 문제 수 |
| myRanking | object | 내 랭킹 정보 |
| myRanking.rank | number | 내 순위 (1부터 시작) |

#### 레벨 계산

```
level = Math.floor(expPoint / 100)
```

경험치 100당 1레벨씩 증가합니다.

---

## 에러 응답

### 401 Unauthorized

인증 실패 시 반환됩니다.

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found

내 랭킹 정보를 찾을 수 없는 경우 반환됩니다.

```json
{
  "statusCode": 404,
  "message": "내 랭킹 정보를 찾을 수 없습니다.",
  "error": "Not Found"
}
```

---

## 비즈니스 규칙

| 규칙 | 설명 |
|------|------|
| 랭킹 목록 | User 또는 Statistics가 없는 유저는 목록에서 제외 |
| 내 랭킹 | Statistics가 없으면 404 에러 반환 |
| 문제 풀이 기록 없음 | solvedCount, correctCount는 0으로 반환 |
| 랭킹 제한 | 상위 100명까지만 반환 |
