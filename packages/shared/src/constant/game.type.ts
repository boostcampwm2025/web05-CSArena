import { ISODateString } from "./common.type";
import { OpponentProfile } from "./user-info.type";
import { Category } from "./category.type";

type MatchResult = "win" | "draw" | "lose";
type MatchType = "multi" | "single";

type BaseHistory = { type: MatchType };

export type MatchHistory = BaseHistory & {
  type: "multi";
  opponent: OpponentProfile;
  result: MatchResult;
  myTotalScore: number;
  opponentTotalScore: number;
  tierDelta: number;
  playedAt: ISODateString;
};
export type SingleplayHistory = BaseHistory & {
  type: "single";
  categories: Pick<Category, "name">[];
  expDelta: number;
  playedAt: ISODateString;
};

export type HistoryItem = MatchHistory | SingleplayHistory;

export type AnswerStatus = "incorrect" | "partial" | "correct";

export type SubmissionResult = {
  status: AnswerStatus;
  submittedAnswer: string;
  solvedAt: ISODateString;
};
export type MySubmission = Pick<SubmissionResult, "status" | "submittedAnswer">;
export type OpponentSubmission = Pick<SubmissionResult, "submittedAnswer">;

export type Solution = {
  bestAnswer: string;
  explanation: string;
  aiFeedback: string;
};
