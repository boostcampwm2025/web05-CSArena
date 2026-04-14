import {
  OpponentLevelInfo,
  OpponentProfile,
  OpponentTierInfo,
  TierInfo,
} from "./constant/user-info.type";
import { Question } from "./constant/question.type";
import {
  MySubmission,
  OpponentSubmission,
  Solution,
} from "./constant/game.type";

// 클라이언트에서 서버로 보내는 요청 객체는 interface로, 이외의 모든 요청, 응답 객체는 type으로 선언
// 네이밍 컨벤션은 요청 객체 마지막에 Dto, 응답 객체 마지막에 Ack 추가

export type WsError = { message: string };

export type AckVoid = { error?: never };
export type AckData<T> = { data: T; error?: never };
export type AckError = { error: WsError; data?: never };

export type Ack<T = void> = T extends void
  ? AckVoid | AckError
  : AckData<T> | AckError;

// #region Matching

// match:enqueue C -> S (Ack)
export type MatchEnqueueAck = Ack;

// match:dequeue C -> S (Ack)
export type MatchDequeueAck = Ack;

// match:found S -> C
export type MatchFoundDto = {
  opponent: {
    profile: OpponentProfile;
    tierInfo: OpponentTierInfo;
    levelInfo: OpponentLevelInfo;
  };
};

// match:end S -> C
export type MatchEndDto = {
  isWin: boolean;
  my: {
    score: number;
    correctCnt: number;
    tierChange: { tierInfo: TierInfo; delta: number };
  };
  opponent: {
    score: number;
    correctCnt: number;
    tierChange: { tierInfo: TierInfo; delta: number };
  };
  questionHistory: {
    question: Question;
    mySubmission: MySubmission;
    opponentSubmission: OpponentSubmission;
    solution: Solution;
  }[];
};

// #endregion

// #region Round

// round:ready S -> C
export type RoundReadyDto = {
  durationSec: number;
  roundIndex: number;
  totalRounds: number;
};

// round:start S -> C
export type RoundStartDto = {
  curRoundIndex: number;
  durationSec: number;
  question: Question;
};

// round:end S -> C
export type RoundEndDto = {
  curRoundIndex: number;
  durationSec: number;
  question: Question;
  mySubmission: MySubmission;
  opponentSubmission: OpponentSubmission;
  solution: Solution;
};

// round:tick S -> C
export type RoundTickDto = { remainedSec: number };

// submit:answer C -> S (Ack)
export interface SubmitAnswerDto {
  answer: string;
}
export type SubmitAnswerAck = Ack;

// opponent:submitted S -> C

// #endregion

// #region Error S -> C
export type ErrorDto = { message: string };

// error

// #endregion
