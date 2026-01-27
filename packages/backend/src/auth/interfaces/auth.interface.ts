export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  user: {
    id: number;
    visibleId: string;
    nickname: string;
    email: string | null;
    userProfile: string | null;
    tier: string;
    expPoint: number;
    winCount: number;
    loseCount: number;
  };
}
