export type UserInfo = {
  nickname: string;
  tier: string;
  expPoint: number;
};

export type MatchEnqueueRes = { ok: true; sessionId: string } | { ok: false; error: string };

export type MatchDequeueReq = { sessionId: string };

export type MatchDequeueRes = { ok: true } | { ok: false; error: string };

export type MatchFound = { opponent: { nickname: string; tier: string; expPoint: number } };
