export type UserInfo = {
  nickname: string;
  tier: string;
  expPoint: number;
};

export type MatchEnqueueRes = { ok: true; sessionId: string } | { ok: false; error: string };

export type MatchDequeueReq = { sessionId: string };

export type MatchDequeueRes = { ok: true } | { ok: false; error: string };

export type MatchFound = { opponent: { nickname: string; tier: string; expPoint: number } };

export type RoundReady = { durationSec: number; roundIndex: number; totalRounds: number };

export type RoundStart = {
  durationSec: number;
  question: { topic: string; difficulty: string; type: string; content: string };
};

export type RoundEnd = {
  durationSec: number;
  result: {
    my: { submitted: string; delta: number; total: number; correct: boolean };
    opponent: { submitted: string; delta: number; total: number; correct: boolean };
  };
  solution: { bestAnswer: string; explanation: string };
};

export type RoundTick = { remainedSec: number };

export type SubmitAnswerReq = { answer: string };

export type SubmitAnswerRes = { ok: true } | { ok: false; error: string };

export type MatchEnd = { isWin: boolean; finalScores: { my: number; opponent: number } };
