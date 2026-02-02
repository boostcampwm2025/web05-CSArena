import { BadRequestException } from '@nestjs/common';

export function parseUserId(userId: string): number {
  const parsed = parseInt(userId, 10);

  if (isNaN(parsed)) {
    throw new BadRequestException('유효하지 않은 사용자 ID입니다');
  }

  return parsed;
}
