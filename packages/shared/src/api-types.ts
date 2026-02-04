import { ISODateString } from "./constant/common.type";
import {
  LevelInfo,
  MatchStatistics,
  Profile,
  SolvedStatistics,
  TierInfo,
} from "./constant/user-info.type";
import { Question } from "./constant/question.type";
import { Category } from "./constant/category.type";
import { HistoryItem, MySubmission, Solution } from "./constant/game.type";

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
export interface RefreshTokenRes {
  message: string;
}

// GET /api/auth/logout
// ** 로그아웃은 GET 대신 POST를 사용 **
// ** 응답 객체를 별도로 사용하지 않는 대신 204 코드로 로그아웃 성공 응답 **

// #endregion

// #region User

// GET /api/users/me
export interface FetchUserInfoRes {
  profile: Profile;
  tierInfo: TierInfo;
  levelInfo: LevelInfo;
  matchStatistics: MatchStatistics;
  solvedStatistics: SolvedStatistics;
}

// GET /api/users/me/tier-history
export interface FetchUserTierHistoryRes {
  history: { tierInfo: TierInfo; delta: number; updatedAt: ISODateString }[];
}

// GET /api/users/me/match-history
export interface FetchUserMatchHistoryRes {
  history: HistoryItem[];
}

// #endregion

// #region single-play

// GET /api/singleplay/categories
// ** GET /api/quiz/categories 엔드포인트와 중복됨. **
// ** Category 타입은 GET /api/quiz/categories에서 사용한 응답 객체가 옳바르다고 판단하여 해당 객체로 통일. **
// ** 단, parentId는 불필요하다고 판단하여 parent를 nullable 값으로 변경하고 parentId 제거. **
export interface FetchCategoriesRes {
  categories: Category[];
}

// POST /api/singleplay/start
// ** 엔드포인트 이름이 새 세션을 가져온다라는 느낌으로 수정하는 것이 좋아보임. **
// ** POST /api/singleplay/sessions **
export interface StartSinglePlayRes {
  matchId: number;
}

// GET /api/singleplay/question?categoryId=
// ** categoryIds로 이름을 바꾸는게 좋을 듯 **
// ** 또한 Restful하게 바꿀려면 GET /api/singleplay/sessions/{sessionId}/question?categoryIds=
export interface FetchQuestionRes {
  question: Question;
}

// POST /api/singleplay/submit
// ** 마찬가지로 POST /api/singleplay/sessions/{sessionId}/submission
export interface SubmitAnswerReq {
  questionId: number;
  answer: string;
}

export interface SubmitAnswerRes {
  grade: {
    submittedAnswer: string;
    isCorrect: boolean;
    aiFeedback: string;
  };
  level: number;
  needExpPoint: number;
  remainedExpPoint: number;
}

// #endregion

// #region problem-bank

// GET /api/problem-bank?categoryIds=&difficulty=&result=&isBookmarked=&search=&page=&limit=
// ** 필터로 카테고리가 추가될 때 마다 쿼리 파라미터를 새로 추가하여 붙임 **
// ** http://localhost:3000/api/problem-bank?page=1&limit=9&categoryIds=6&categoryIds=1 **
// ** 쉼표(,)를 구분자로 활용하여 쿼리 파라미터를 추가하도록 수정할 필요가 있음. (ex. categoryIds=1,6) **
export interface FetchProblemBankRes {
  items: {
    question: Question;
    mySubmission: MySubmission;
    solution: Solution;
    isBookmarked: boolean;
  }[];
  totalPages: number;
  currentPage: number;
}

// GET /api/problem-bank/statistics
export interface FetchSolvedStatisticsRes {
  statistics: SolvedStatistics;
}

// PATCH /api/problem-bank/{id}/bookmark
// ** 리소스 상태를 isBookmarked로 맞춘다는 의미로 PUT이 더 명확해보임 **
// ** 경로 파라미터도 id보단 questionId로 명확하게 명시해야 함 **
export interface CheckBookmarkReq {
  isBookmarked: boolean;
}

// #endregion

// #region Feedback

// POST /api/feedbacks: 피드백 제출
export interface SubmitFeedbackReq {
  content: string;
}

// #endregion
