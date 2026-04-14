import { ISODateString } from "./common.type";

// ** email 속성은 불필요하다고 판단하여 제거 **
export type Profile = {
  nickname: string;
  profileImage: string;
  createdAt: ISODateString;
};

export type OpponentProfile = Pick<Profile, "nickname" | "profileImage">;

// ** Rank라는 용어를 Tier로 통일 **
export type TierInfo = {
  tier: string;
  tierPoint: number;
};

export type OpponentTierInfo = TierInfo;

export type LevelInfo = {
  level: number;
  needExpPoint: number;
  remainedExpPoint: number;
};

export type OpponentLevelInfo = Pick<LevelInfo, "level">;

// ** winRate는 winCount / totalMatches로 계산한 값을 사용할 예정 **
export type MatchStatistics = {
  totalMatches: number;
  winCount: number;
  drawCount: number;
  loseCount: number;
};

// ** correctRate는 correctCount / totalSolved로 계산한 값을 사용할 예정 **
export type SolvedStatistics = {
  totalSolved: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
};
