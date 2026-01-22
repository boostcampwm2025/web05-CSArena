export class ProblemBankItemDto {
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
}

export class ProblemBankStatisticsDto {
  totalSolved: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  correctRate: number;
}

export class ProblemBankResponseDto {
  items: ProblemBankItemDto[];
  totalPages: number;
  currentPage: number;
}
