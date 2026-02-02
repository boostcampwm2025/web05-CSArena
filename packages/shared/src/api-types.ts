import { Profile, TierInfo, LevelInfo, MatchStatistics, SolvedStatistics } from "./constant";
import { Category, Question } from "./constant";
import { SubmissionResult } from "./constant";
import { MatchType } from "./constant";

// 요청 객체는 interface로, 응답 객체는 type으로 선언

// #region Auth

// GET /api/auth/dev-login
// ** GET 요청에는 바디를 포함하지 않음. 로그인 요청은 POST가 맞다고 판단됨. **
export interface LoginDevReq {
  name: string;
}

// GET /api/auth/github

// GET /api/auth/github/callback

// GET /api/auth/refresh
export type RefreshTokenRes = { ok: true; accessToken: string } | { ok: false; message: string };

// GET /api/auth/logout
export type LogoutRes = { ok: true } | { ok: false; message: string };

// #endregion

// #region User

// GET /api/users/me
export type FetchUserInfoRes = {
  profile: Profile;
  tierInfo: TierInfo;
  levelInfo: LevelInfo;
  matchStatistics: MatchStatistics;
  solvedStatistics: SolvedStatistics;
};

// GET /api/users/me/tier-history
export type FetchUserTierHistoryRes = {
  history: { tierInfo: TierInfo; delta: number; updatedAt: Date }[];
};

// GET /api/users/me/match-history
export type FetchUserMatchHistoryRes = {
  history: { type: MatchType }[];
};

// #endregion

// #region single-play

// GET /api/singleplay/categories
// ** GET /api/quiz/categories 엔드포인트와 중복됨. **
// ** Category 타입은 GET /api/quiz/categories에서 사용한 응답 객체가 옳바르다고 판단하여 해당 객체로 통일. **
// ** 단, parentId는 불필요하다고 판단하여 parent를 nullable 값으로 변경하고 parentId 제거. **
export type FetchCategoriesRes = { ok: true; categories: Category[] } | { ok: false; message: string };

// POST /api/singleplay/start
// ** 엔드포인트 이름이 새 세션을 가져온다라는 느낌으로 수정하는 것이 좋아보임. **
// ** 그에 따라 메소드가 POST가 아닌 GET으로 수정할 필요가 있어보임. **
export type StartSinglePlayRes = { ok: true; matchId: number } | { ok: false; message: string };

// GET /api/singleplay/question?categoryId=
// ** categoryIds로 이름을 바꾸는게 좋을 듯 **
export type FetchQuestionRes = { ok: true; question: Question } | { ok: false; message: string };

// POST /api/singleplay/submit
export interface SubmitAnswerReq {
  matchId: number;
  questionId: number;
  answer: string;
}
export type SubmitAnswerRes =
  | {
      ok: true;
      grade: { submittedAnswer: string; isCorrect: boolean; aiFeedback: string };
      level: number;
      needExpPoint: number;
      remainedExpPoint: number;
    }
  | { ok: false; message: string };

// #endregion

// #region problem-bank

// GET /api/problem-bank?categoryIds=&difficulty=&result=&isBookmarked=&search=&page=&limit=
// ** 필터로 카테고리가 추가될 때 마다 쿼리 파라미터를 새로 추가하여 붙임 **
// ** http://localhost:3000/api/problem-bank?page=1&limit=9&categoryIds=6&categoryIds=1 **
// ** 쉼표(,)를 구분자로 활용하여 쿼리 파라미터를 추가하도록 수정할 필요가 있음. (ex. categoryIds=1,6) **
export type FetchProblemBankRes =
  | {
      ok: true;
      items: {
        question: Question;
        mySubmission: MySubmission;
        solution: Solution;
        isBookMarked: boolean;
      }[];
      totalPages: number;
      currentPage: number;
    }
  | { ok: false; message: string };

// GET /api/problem-bank/statistics
export type FetchSolvedStatisticsRes = { ok: true; statistics: SolvedStatistics } | { ok: false; message: string };

// PATCH /api/problem-bank/{id}/bookmark
export interface CheckBookmarkReq {
  isBookmarked: boolean;
}
export type CheckBookmarkRes = { ok: true } | { ok: false; message: string };

// #endregion

// #region Feedback

// POST /api/feedbacks: 피드백 제출
export interface SubmitFeedbackReq {
  content: string;
}
export type SubmitFeedbackRes = { ok: true } | { ok: false; message: string };

// #endregion
