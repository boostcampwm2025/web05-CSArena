import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsNotEmpty({ message: 'questionId는 필수입니다.' })
  @IsNumber({}, { message: 'questionId는 숫자여야 합니다.' })
  questionId: number;

  @IsNotEmpty({ message: 'answer는 필수입니다.' })
  @IsString({ message: 'answer는 문자열이어야 합니다.' })
  answer: string;
}
