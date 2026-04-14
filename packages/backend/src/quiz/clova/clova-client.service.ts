import { HttpException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaApiResponse, ClovaRequestDto } from './clova.type';

class RateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`NCP AI rate limited, retry after ${retryAfterMs}ms`);
  }
}

@Injectable()
export class ClovaClientService {
  private readonly logger = new Logger(ClovaClientService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-007';

  private readonly TIMEOUT_MS = 10_000;
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_BASE_DELAY_MS = 500;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CLOVA_STUDIO_API_KEY') || '';
  }

  async callClova<T = never>(dto: ClovaRequestDto): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // 429의 경우 Retry-After 헤더값을 우선 사용, 없으면 지수 백오프
        const delay =
          lastError instanceof RateLimitError
            ? lastError.retryAfterMs
            : this.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        this.logger.warn(`Clova API 재시도 (${attempt}/${this.MAX_RETRIES})`);
      }

      try {
        return await this.fetchOnce<T>(dto);
      } catch (error) {
        // 클라이언트 오류(4xx, 429 제외) 또는 콘텐츠 오류는 재시도해도 결과가 달라지지 않는다
        if (error instanceof HttpException) {
          throw error;
        }

        lastError = error;
        this.logger.warn(
          `Clova API 일시 오류 (attempt ${attempt + 1}): ${(error as Error).message}`,
        );
      }
    }

    this.logger.error(`Clova API ${this.MAX_RETRIES + 1}회 모두 실패`, lastError);
    throw new InternalServerErrorException('AI 서비스 호출 중 오류가 발생했습니다.');
  }

  private async fetchOnce<T>(dto: ClovaRequestDto): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: dto.systemPrompt },
            { role: 'user', content: dto.userMessage },
          ],
          topP: 0.8,
          topK: 0,
          maxCompletionTokens: 1000,
          temperature: 0.5,
          repetitionPenalty: 1.1,
          thinking: { effort: 'none' },
          stop: [],
          responseFormat: {
            type: 'json',
            schema: dto.jsonSchema,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 429: 업스트림 레이트 리밋 → Retry-After 반영 후 재시도
        if (response.status === 429) {
          const retryAfterMs = this.parseRetryAfterMs(response.headers.get('Retry-After'));
          throw new RateLimitError(retryAfterMs);
        }

        // 4xx (429 제외): 요청 자체가 잘못된 것이므로 재시도 불필요 → HttpException으로 즉시 종료
        if (response.status < 500) {
          throw new InternalServerErrorException(`NCP AI 호출 실패: ${response.status}`);
        }

        // 5xx: 서버 일시 오류 → 상위 루프에서 재시도
        throw new Error(`NCP AI 서버 오류: ${response.status}`);
      }

      const data = (await response.json()) as ClovaApiResponse;
      const content = data?.result?.message?.content;

      if (!content) {
        throw new InternalServerErrorException('AI 응답이 비어있습니다.');
      }

      try {
        return JSON.parse(content) as T;
      } catch (e) {
        this.logger.warn('JSON 파싱에 실패하여 문자열로 반환합니다.', e);

        return content as unknown as T;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseRetryAfterMs(header: string | null): number {
    if (!header) {
      return this.RETRY_BASE_DELAY_MS;
    }

    // 숫자: 초 단위
    const seconds = parseInt(header, 10);

    if (!isNaN(seconds)) {
      return Math.min(seconds * 1000, this.TIMEOUT_MS);
    }

    // HTTP 날짜 형식
    const date = new Date(header);

    if (!isNaN(date.getTime())) {
      return Math.max(0, Math.min(date.getTime() - Date.now(), this.TIMEOUT_MS));
    }

    return this.RETRY_BASE_DELAY_MS;
  }
}
