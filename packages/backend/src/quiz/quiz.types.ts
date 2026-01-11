interface BaseQuestion {
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  explanation: string;
}

export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MultipleChoiceOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: MultipleChoiceOptions;
  answer: 'A' | 'B' | 'C' | 'D';
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer';
  answer: string;
  keywords: string[];
}

export interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  sampleAnswer: string;
  keywords: string[];
}

export type Question = MultipleChoiceQuestion | ShortAnswerQuestion | EssayQuestion;

export interface Submission {
  playerId: string;
  answer: string;
  submittedAt: number;
}

export interface GradeResult {
  playerId: string;
  answer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
}

export interface FinalResult {
  winnerId: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
}

export interface RoundResult {
  roundNumber: number;
  grades: GradeResult[];
  finalResult?: FinalResult;
}

export type RoundStatus = 'waiting' | 'in_progress' | 'completed';

export interface RoundData {
  roundNumber: number;
  status: RoundStatus;
  question: Question | null;
  submissions: {
    [playerId: string]: Submission | null;
  };
  result: RoundResult | null;
}
