export class OpponentDto {
  nickname: string;
  profileImage: string | null;
}

export class MultiMatchDto {
  opponent: OpponentDto;
  result: 'win' | 'lose' | 'draw';
  myScore: number;
  opponentScore: number;
  tierPointChange: number;
  playedAt: Date;
}

export class SingleMatchCategoryDto {
  name: string;
}

export class SingleMatchDto {
  category: SingleMatchCategoryDto;
  expGained: number;
  playedAt: Date;
}

export class MatchHistoryItemDto {
  type: 'multi' | 'single';
  match: MultiMatchDto | SingleMatchDto;
}

export class MatchHistoryResponseDto {
  matchHistory: MatchHistoryItemDto[];
  hasMore: boolean;
  nextCursor?: Date;
}
