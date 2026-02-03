import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MatchHistoryQueryDto {
  @IsOptional()
  @IsEnum(['multi', 'single', 'all'])
  matchType?: 'multi' | 'single' | 'all' = 'all';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Date)
  cursor?: Date;
}
