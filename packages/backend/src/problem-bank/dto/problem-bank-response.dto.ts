import { ApiProperty } from '@nestjs/swagger';

export class ProblemBankItemDto {
  @ApiProperty({ description: '문제 은행 항목 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '문제 ID', example: 1 })
  questionId: number;

  @ApiProperty({ description: '문제 내용', example: 'HTTP와 HTTPS의 차이점은?' })
  questionContent: string;

  @ApiProperty({ description: '카테고리 목록', example: ['네트워크', 'HTTP'] })
  categories: string[];

  @ApiProperty({ description: '난이도', enum: ['easy', 'medium', 'hard'], example: 'easy' })
  difficulty: 'easy' | 'medium' | 'hard';

  @ApiProperty({
    description: '정답 상태',
    enum: ['correct', 'incorrect', 'partial'],
    example: 'correct',
  })
  answerStatus: 'correct' | 'incorrect' | 'partial';

  @ApiProperty({ description: '북마크 여부', example: false })
  isBookmarked: boolean;

  @ApiProperty({ description: '사용자 답안', example: 'A' })
  userAnswer: string;

  @ApiProperty({ description: '정답', example: 'A' })
  correctAnswer: string;

  @ApiProperty({ description: 'AI 피드백', example: '정답입니다!' })
  aiFeedback: string;

  @ApiProperty({ description: '풀이 시간', example: '2024-01-01T00:00:00.000Z' })
  solvedAt: string;
}

export class ProblemBankStatisticsDto {
  @ApiProperty({ description: '총 풀이 수', example: 100 })
  totalSolved: number;

  @ApiProperty({ description: '정답 수', example: 70 })
  correctCount: number;

  @ApiProperty({ description: '오답 수', example: 20 })
  incorrectCount: number;

  @ApiProperty({ description: '부분 정답 수', example: 10 })
  partialCount: number;

  @ApiProperty({ description: '정답률 (%)', example: 70.0 })
  correctRate: number;
}

export class ProblemBankResponseDto {
  @ApiProperty({ description: '문제 목록', type: [ProblemBankItemDto] })
  items: ProblemBankItemDto[];

  @ApiProperty({ description: '총 페이지 수', example: 10 })
  totalPages: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  currentPage: number;
}
