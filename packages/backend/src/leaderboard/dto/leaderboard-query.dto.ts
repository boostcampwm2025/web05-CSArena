import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum MatchType {
  MULTI = 'multi',
  SINGLE = 'single',
}

export class LeaderboardQueryDto {
  @ApiProperty({
    enum: MatchType,
    description: '매칭 타입',
    example: 'multi',
  })
  @IsEnum(MatchType)
  type: MatchType;
}
