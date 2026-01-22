export type UserData = {
  userId: string;
  nickname: string;
  tier: string;
  expPoint: number;
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
