import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateBookmarkDto {
  @ApiProperty({
    description: '북마크 상태',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isBookmarked: boolean;
}
