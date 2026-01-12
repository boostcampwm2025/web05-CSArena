import { Question } from '../../quiz/quiz.types';
import { UserInfo } from './user.interface';

// ============================================
// Game Session & Round State
// ============================================

export interface GameSession {
  roomId: string;
  player1Id: string;
  player1SocketId: string;
  player1Info: UserInfo;
  player1Score: number;
  player2Id: string;
  player2SocketId: string;
  player2Info: UserInfo;
  player2Score: number;
  currentRound: number;
  totalRounds: number;
  rounds: Map<number, RoundData>;
}

export type RoundStatus = 'waiting' | 'in_progress' | 'completed';

export interface Submission {
  playerId: string;
  answer: string;
  submittedAt: number;
}

export interface RoundData {
  roundNumber: number;
  status: RoundStatus;
  question: Question | null;
  submissions: {
    [playerId: string]: Submission | null;
  };
  result: RoundResult | null;
}

// ============================================
// Grading Types
// ============================================

export interface GradeResult {
  playerId: string;
  answer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
}

export interface RoundResult {
  roundNumber: number;
  grades: GradeResult[];
}

export interface GradingInput {
  question: Question;
  submissions: Submission[];
}

// ============================================
// WebSocket Event Payloads
// ============================================

// submit:answer
export interface SubmitAnswerRequest {
  answer: string;
}

export interface SubmitAnswerResponse {
  ok: boolean;
  error?: string;
}
