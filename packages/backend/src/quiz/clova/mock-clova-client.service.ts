import { Injectable, Logger } from '@nestjs/common';

import { ClovaRequestDto } from './clova.type';

/**
 * ClovaClientService의 Mock 구현체
 * - 부하테스트 시 실제 AI API 호출 없이 가짜 응답을 반환
 * - 실제 API의 지연시간을 시뮬레이션 (MOCK_CLOVA_DELAY_MS 환경변수로 조절)
 */
@Injectable()
export class MockClovaClientService {
  private readonly logger = new Logger(MockClovaClientService.name);
  private readonly delayMs: number;

  constructor() {
    this.delayMs = parseInt(process.env.MOCK_CLOVA_DELAY_MS ?? '300', 10);
    this.logger.warn(`Mock Clova 클라이언트 활성화 (지연: ${this.delayMs}ms)`);
  }

  async callClova<T = never>(dto: ClovaRequestDto): Promise<T> {
    // 실제 API 지연시간 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    const playerIds = this.extractPlayerIds(dto.userMessage);

    const mockResponse = {
      grades: playerIds.map((playerId) => ({
        playerId,
        isCorrect: Math.random() > 0.4,
        score: Math.floor(Math.random() * 11),
        feedback: '[Mock] AI 채점 피드백입니다.',
      })),
    };

    return mockResponse as T;
  }

  private extractPlayerIds(userMessage: string): string[] {
    try {
      const match = userMessage.match(/<USER_ANSWER>\s*([\s\S]*?)\s*<\/USER_ANSWER>/);

      if (match) {
        const parsed = JSON.parse(match[1]) as { playerId: string }[];

        return parsed.map((p) => p.playerId);
      }
    } catch {
      this.logger.warn('Mock: USER_ANSWER 파싱 실패');
    }

    return [];
  }
}
