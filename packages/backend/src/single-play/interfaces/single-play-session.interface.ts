export interface AnswerSubmission {
  questionId: number;
  answer: string;
  submittedAt: number;
  isCorrect: boolean;
  score: number;
  feedback: string;
}
