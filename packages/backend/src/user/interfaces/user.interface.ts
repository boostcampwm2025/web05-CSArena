export interface UserInfo {
  nickname: string;
  profileImage: string | null;
  tier: string;
  tierPoint: number;
  exp_point: number;
}

export interface ProblemStatsRaw {
  totalSolved: string;
  correctCount: string;
  incorrectCount: string;
  partialCount: string;
}
