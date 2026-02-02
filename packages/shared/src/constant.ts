// ** email 속성은 불필요하다고 판단하여 제거 **
export type Profile = {
  nickname: string;
  profileImage: string;
  createdAt: Date;
};

// ** Rank라는 용어를 Tier로 통일 **
export type TierInfo = {
  tier: string;
  tierPoint: number;
};

export type LevelInfo = {
  level: number;
  needExpPoint: number;
  remainedExpPoint: number;
};

// ** winRate는 winCount / totalMatches로 계산한 값을 사용할 예정 **
export type MatchStatistics = {
  totalMatches: number;
  winCount: number;
  drawCount: number;
  loseCount: number;
};

// ** correctRate는 correctCount / totalSolved로 계산한 값을 사용할 예정 **
export type SolvedStatistics = {
  totalSolved: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
};

export type Category = {
  id: number;
  name: string;
  parent: Category | undefined;
};

export type QuestionType = "multiple" | "short" | "essay";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type MultipleChoiceOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

type QuestionBase = {
  id: number;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  content: string;
  majorCategory: Category;
  minorCategory: Category;
};

export type MultipleQuestion = QuestionBase & {
  type: "multiple";
  options: MultipleChoiceOptions;
};
export type ShortQuestion = QuestionBase & { type: "short" };
export type EssayQuestion = QuestionBase & { type: "essay" };

export type Question = MultipleQuestion | ShortQuestion | EssayQuestion;

export type AnswerStatus = "incorrect" | "partial" | "correct";

export type SubmissionResult = { status: AnswerStatus; submittedAnswer: string; bestAnswer: string; aiFeedback: string; solvedAt: Date };

export type MatchType = "multi" | "single";
