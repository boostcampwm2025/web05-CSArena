import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({
    description: '매치 ID (세션 ID)',
    example: 123,
  })
  @IsNotEmpty({ message: 'matchId는 필수입니다.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'matchId는 숫자여야 합니다.' })
  matchId: number;

  @ApiProperty({
    description: '문제 ID',
    example: 1,
  })
  @IsNotEmpty({ message: 'questionId는 필수입니다.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'questionId는 숫자여야 합니다.' })
  questionId: number;

  @ApiProperty({
    description: '사용자 답안',
    example: 'A',
  })
  @IsNotEmpty({ message: 'answer는 필수입니다.' })
  @IsString({ message: 'answer는 문자열이어야 합니다.' })
  answer: string;
}
