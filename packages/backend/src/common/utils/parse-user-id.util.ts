import { BadRequestException } from '@nestjs/common';

export function parseUserId(userId: string): number {
  if (!/^\d+$/.test(userId)) {
    throw new BadRequestException('유효하지 않은 사용자 ID입니다');
  }

  return Number(userId);
}
