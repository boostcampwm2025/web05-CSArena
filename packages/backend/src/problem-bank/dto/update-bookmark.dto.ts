import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateBookmarkDto {
  @IsBoolean()
  @IsNotEmpty()
  isBookmarked: boolean;
}
