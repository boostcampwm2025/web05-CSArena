import { Question as QuestionEntity } from '../../quiz/entity';
import { UserInfo } from '../../user/interfaces';

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
  currentPhase: 'ready' | 'question' | 'grading' | 'review' | 'finished';
  currentPhaseStartTime: number;
}

export type RoundStatus = 'waiting' | 'in_progress' | 'completed';
export type RoundPhase = 'ready' | 'question' | 'grading' | 'review' | 'finished';

export interface Submission {
  playerId: string;
  answer: string;
  submittedAt: number;
}

export interface RoundData {
  roundNumber: number;
  status: RoundStatus;
  question: QuestionEntity | null;
  questionId: number | null; // DB에서 조회한 question의 ID
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
  finalResult?: FinalResult;
}

export interface FinalResult {
  winnerId: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
}

export interface GradingInput {
  question: QuestionEntity;
  submissions: Submission[];
}

// ============================================
// WebSocket Event Payloads
// ============================================

// round:ready
export interface RoundReadyEvent {
  startedAt: number;
  durationSec: number;
  roundIndex: number;
  totalRounds: number;
}

// round:start
export interface RoundStartEvent {
  startedAt: number;
  durationSec: number;
  question: {
    category: string[];
    difficulty: string;
    type: string;
    content: { question: string; option: string[] } | { question: string };
  };
}

// round:end
export interface RoundEndEvent {
  startedAt: number;
  durationSec: number;
  results: {
    my: PlayerRoundResult;
    opponent: PlayerRoundResult;
  };
  solution: {
    bestAnswer: string;
    explanation: string;
  };
}

export interface PlayerRoundResult {
  submitted: string;
  delta: number;
  total: number;
  correct: boolean;
}

// round:tick
export interface RoundTickEvent {
  remainedSec: number;
}

// match:end
export interface MatchEndEvent {
  isWin: boolean;
  finalScores: {
    my: number;
    opponent: number;
  };
  tierPointChange: number;
}

// submit:answer
export interface SubmitAnswerRequest {
  answer: string;
}

export interface SubmitAnswerResponse {
  ok: boolean;
  error?: string;
  opponentSubmitted?: boolean;
}
