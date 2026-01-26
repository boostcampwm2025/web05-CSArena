import { ApiProperty } from '@nestjs/swagger';

export class MultiRankingItemDto {
  @ApiProperty({ description: '유저 닉네임' })
  nickname: string;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  userProfile: string | null;

  @ApiProperty({ description: '티어 점수' })
  tierPoint: number;

  @ApiProperty({ description: '승리 횟수' })
  winCount: number;

  @ApiProperty({ description: '패배 횟수' })
  loseCount: number;
}

export class MultiMyRankingDto extends MultiRankingItemDto {
  @ApiProperty({ description: '내 순위' })
  rank: number;
}

export class MultiLeaderboardResponseDto {
  @ApiProperty({ type: [MultiRankingItemDto], description: '상위 100명 랭킹' })
  rankings: MultiRankingItemDto[];

  @ApiProperty({ type: MultiMyRankingDto, description: '내 랭킹' })
  myRanking: MultiMyRankingDto;
}

export class SingleRankingItemDto {
  @ApiProperty({ description: '유저 닉네임' })
  nickname: string;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  userProfile: string | null;

  @ApiProperty({ description: '경험치' })
  expPoint: number;

  @ApiProperty({ description: '푼 문제 수' })
  solvedCount: number;

  @ApiProperty({ description: '맞춘 문제 수' })
  correctCount: number;
}

export class SingleMyRankingDto extends SingleRankingItemDto {
  @ApiProperty({ description: '내 순위' })
  rank: number;
}

export class SingleLeaderboardResponseDto {
  @ApiProperty({ type: [SingleRankingItemDto], description: '상위 100명 랭킹' })
  rankings: SingleRankingItemDto[];

  @ApiProperty({ type: SingleMyRankingDto, description: '내 랭킹' })
  myRanking: SingleMyRankingDto;
}

export type LeaderboardResponseDto = MultiLeaderboardResponseDto | SingleLeaderboardResponseDto;
