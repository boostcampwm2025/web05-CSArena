export interface SinglePlaySession {
  userId: string;
  categoryIds: number[];
  questionIds: number[];
  answers: Map<number, AnswerSubmission>;
  scores: Map<number, number>;
  status: 'playing' | 'completed';
  createdAt: number;
}

export interface AnswerSubmission {
  questionId: number;
  answer: string;
  submittedAt: number;
  isCorrect: boolean;
  score: number;
  feedback: string;
}
