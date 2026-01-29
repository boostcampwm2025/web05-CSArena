export type UserData = {
  userId: string;
  nickname: string;
  profileImage: string | null;
  tier: string;
  tierPoint: number;
  level: number;
  needExpPoint: number;
  remainedExpPoint: number;
  isSentFeedback: boolean;
};

// 문제은행 Types
export type ProblemBankItem = {
  id: number;
  questionId: number;
  questionContent: string;
  categories: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  answerStatus: 'correct' | 'incorrect' | 'partial';
  isBookmarked: boolean;
  userAnswer: string;
  correctAnswer: string;
  aiFeedback: string;
  solvedAt: string;
};

export type ProblemBankStatistics = {
  totalSolved: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  correctRate: number;
};

export type ProblemBankResponse = {
  items: ProblemBankItem[];
  totalPages: number;
  currentPage: number;
};

export type ProblemBankFilters = {
  categoryIds: number[];
  difficulty?: 'easy' | 'medium' | 'hard';
  result?: 'correct' | 'incorrect' | 'partial';
  isBookmarked?: boolean;
  search: string;
  page: number;
  limit: number;
};

export type Category = {
  id: number;
  name: string;
  parentId: number | null;
  parent?: Category;
};

// MyPage Types - Based on API Specification
export type UserProfile = {
  nickname: string;
  profileImage: string | null;
  email: string;
  createdAt: string;
};

export type UserRank = {
  tier: string;
  tierPoint: number;
};

export type UserLevel = {
  level: number;
  needExpPoint: number;
  remainedExpPoint: number;
};

export type MatchStats = {
  totalMatches: number;
  winCount: number;
  loseCount: number;
  drawCount: number;
  winRate: number;
};

export type ProblemStats = {
  totalSolved: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  correctRate: number;
};

export type MyPageResponse = {
  profile: UserProfile;
  rank: UserRank;
  levelInfo: UserLevel;
  matchStats: MatchStats;
  problemStats: ProblemStats;
};

export type TierHistoryItem = {
  tier: string;
  tierPoint: number;
  changedAt: string;
};

export type TierHistoryResponse = {
  tierHistory: TierHistoryItem[];
};

export type Opponent = {
  nickname: string;
  profileImage: string | null;
};

export type MultiMatch = {
  opponent: Opponent;
  result: 'win' | 'lose';
  myScore: number;
  opponentScore: number;
  tierPointChange: number;
  playedAt: string;
};

export type SingleMatch = {
  category: {
    name: string;
  };
  expGained: number;
  playedAt: string;
};

export type MatchHistoryItem = {
  type: 'multi' | 'single';
  match: MultiMatch | SingleMatch;
};

export type MatchHistoryResponse = {
  matchHistory: MatchHistoryItem[];
};
