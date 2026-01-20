import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  create(userId: string, dto: CreateFeedbackDto) {
    const feedbackData = {
      timestamp: new Date().toISOString(),
      userId,
      category: dto.category,
      content: dto.content,
    };

    this.logger.info('User Feedback Received', feedbackData);

    return { success: true, message: '소중한 의견 감사합니다.' };
  }
}
