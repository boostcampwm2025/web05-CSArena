import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum FeedbackCategory {
  BUG = 'bug',
  CONTENT = 'content',
  OTHER = 'other',
}

export class CreateFeedbackDto {
  @ApiProperty({
    description: '피드백 카테고리',
    enum: FeedbackCategory,
    example: FeedbackCategory.BUG,
  })
  @IsEnum(FeedbackCategory, {
    message: `카테고리는 다음 중 하나여야 합니다: ${Object.values(FeedbackCategory).join(', ')}`,
  })
  @IsNotEmpty({ message: '카테고리는 필수 입력값입니다.' })
  category: FeedbackCategory;

  @ApiProperty({
    description: '피드백 내용',
    example: '문제의 정답이 잘못된 것 같습니다.',
  })
  @IsString({ message: '내용은 문자열 형식이어야 합니다.' })
  @IsNotEmpty({ message: '피드백 내용을 입력해주세요.' })
  content: string;
}
