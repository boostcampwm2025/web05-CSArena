import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum DifficultyFilter {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum ResultFilter {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  PARTIAL = 'partial',
}

export class GetProblemBankQueryDto {
  @ApiPropertyOptional({
    description: '카테고리 ID 목록',
    type: [Number],
    example: [1, 2],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return (Array.isArray(value) ? value : [value]).map(Number);
  })
  @IsArray()
  @IsInt({ each: true, message: '각 categoryId는 정수여야 합니다.' })
  categoryIds?: number[];

  @ApiPropertyOptional({
    description: '난이도 필터',
    enum: DifficultyFilter,
    example: DifficultyFilter.EASY,
  })
  @IsOptional()
  @IsEnum(DifficultyFilter)
  difficulty?: DifficultyFilter;

  @ApiPropertyOptional({
    description: '결과 필터',
    enum: ResultFilter,
    example: ResultFilter.CORRECT,
  })
  @IsOptional()
  @IsEnum(ResultFilter)
  result?: ResultFilter;

  @ApiPropertyOptional({
    description: '북마크 필터',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : value === 'true' || value === true,
  )
  isBookmarked?: boolean;

  @ApiPropertyOptional({
    description: '검색어',
    type: String,
    example: 'HTTP',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '페이지 번호',
    type: Number,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    type: Number,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
