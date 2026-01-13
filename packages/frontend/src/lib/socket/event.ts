export type UserInfo = {
  nickname: string;
  tier: string;
  expPoint: number;
};

export type MatchEnqueueRes = { ok: true; sessionId: string } | { ok: false; error: string };

export type MatchDequeueReq = { sessionId: string };

export type MatchDequeueRes = { ok: true } | { ok: false; error: string };

export type MatchFound = { opponent: { nickname: string; tier: string; expPoint: number } };

export type RoundReady = {
  startedAt: number;
  durationSec: number;
  roundIndex: number;
  totalRounds: number;
};

export type RoundStart = {
  startedAt: number;
  durationSec: number;
  question: {
    category: string[];
    difficulty: 'Easy' | 'Medium' | 'Hard';
    content:
      | { type: 'multiple'; question: string; option: string[] }
      | { type: 'short'; question: string }
      | { type: 'essay'; question: string };
  };
};

export type RoundEnd = {
  startedAt: number;
  durationSec: number;
  result: {
    my: { submitted: string; delta: number; total: number; correct: boolean };
    opponent: { submitted: string; delta: number; total: number; correct: boolean };
  };
  solution: { bestAnswer: string; explanation: string };
};

export type RoundTick = { curServerTime: number };

export type SubmitAnswerReq = { answer: string };

export type SubmitAnswerRes = { ok: true } | { ok: false; error: string };

export type MatchEnd = { isWin: boolean; finalScores: { my: number; opponent: number } };
