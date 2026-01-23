import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('feedback')
@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '피드백 제출',
    description: '사용자가 버그, 콘텐츠, 기타 피드백을 제출합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '피드백 제출 성공',
    schema: {
      properties: {
        id: { type: 'number', example: 1 },
        category: { type: 'string', example: 'bug' },
        content: { type: 'string', example: '문제가 발생했습니다.' },
        userId: { type: 'number', example: 1 },
        createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '유효하지 않은 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  createFeedback(@Body() createFeedbackDto: CreateFeedbackDto, @Req() req: RequestWithUser) {
    return this.feedbackService.create(req.user.id, createFeedbackDto);
  }
}
