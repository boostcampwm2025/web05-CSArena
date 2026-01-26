import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class GetQuestionDto {
  @ApiProperty({
    description: '선택한 카테고리 ID 목록',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsNotEmpty({ message: 'categoryId는 필수입니다.' })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((id: string) => parseInt(id.trim(), 10))
        .filter((id: number) => !isNaN(id));
    }

    return value;
  })
  @IsArray({ message: 'categoryId는 배열이어야 합니다.' })
  @IsNumber({}, { each: true, message: '각 categoryId는 숫자여야 합니다.' })
  categoryId: number[];
}
