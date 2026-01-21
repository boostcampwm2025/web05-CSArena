export interface AnswerSubmission {
  questionId: number;
  answer: string;
  submittedAt: number;
  isCorrect: boolean;
  score: number;
  feedback: string;
}

export interface GameEndResult {
  message: string;
  finalStats: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    totalScore: number;
  };
}
