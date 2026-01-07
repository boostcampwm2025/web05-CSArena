import { Body, Controller, Post, Req } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  createFeedback(@Body() createFeedbackDto: CreateFeedbackDto, @Req() req: RequestWithUser) {
    const userId = req.user?.id || null;

    return this.feedbackService.create(userId, createFeedbackDto);
  }
}
