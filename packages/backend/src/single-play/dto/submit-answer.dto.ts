import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({
    description: '문제 ID',
    example: 1,
  })
  @IsNotEmpty({ message: 'questionId는 필수입니다.' })
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
