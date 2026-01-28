import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

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
  @IsNotEmpty({ message: '매칭 타입은 필수입니다.' })
  @IsEnum(MatchType)
  type: MatchType;
}
