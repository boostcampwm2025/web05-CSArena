import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaApiResponse, ClovaRequestDto } from './clova.type';

@Injectable()
export class ClovaClientService {
  private readonly logger = new Logger(ClovaClientService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-007';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CLOVA_STUDIO_API_KEY') || '';
  }

  async callClova<T = never>(dto: ClovaRequestDto): Promise<T> {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const payload = {
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
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new InternalServerErrorException(`NCP AI 호출 실패: ${response.status}`);
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
    } catch (error) {
      this.logger.error('Clova API 호출에 실패했습니다.', error);

      throw error;
    }
  }
}
