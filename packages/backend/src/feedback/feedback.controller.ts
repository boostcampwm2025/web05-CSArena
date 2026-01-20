import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createFeedback(@Body() createFeedbackDto: CreateFeedbackDto, @Req() req: RequestWithUser) {
    return this.feedbackService.create(req.user.id, createFeedbackDto);
  }
}
