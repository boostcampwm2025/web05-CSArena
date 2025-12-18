import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaApiResponse, ClovaRequestDto } from './clova.type';

@Injectable()
export class ClovaClientService {
  private readonly logger = new Logger(ClovaClientService.name);
  private readonly apiKey: string;
  private readonly apiUrl =
    'https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-003';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CLOVA_STUDIO_API_KEY') || '';
  }

  async callClova(dto: ClovaRequestDto): Promise<string> {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const payload = {
      messages: [{ role: 'system', content: dto.systemPrompt }],
      topP: 0.8,
      topK: 0,
      maxTokens: 1500,
      temperature: 0.5,
      repeatPenalty: 5.0,
      includeAiFilters: true,
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error(`Clova API Error: ${response.status} - ${errorText}`);

        throw new BadRequestException(`NCP AI 호출 실패: ${response.status}`);
      }

      // 타입 단언을 사용하여 안전하게 접근
      const data = (await response.json()) as ClovaApiResponse;
      const content = data?.result?.message?.content;

      if (!content) {
        throw new InternalServerErrorException('AI 응답이 비어있습니다.');
      }

      return content;
    } catch (error) {
      this.logger.error('Failed to call Clova API', error);

      throw error;
    }
  }
}
