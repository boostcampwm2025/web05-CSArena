import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { SinglePlayService } from './single-play.service';
import { GetQuestionDto, SubmitAnswerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('singleplay')
export class SinglePlayController {
  constructor(private readonly singlePlayService: SinglePlayService) {}

  /**
   * 카테고리 목록 조회 API
   * GET /api/singleplay/categories
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories(): Promise<{ categories: Array<{ id: number; name: string | null }> }> {
    const categories = await this.singlePlayService.getCategories();

    return { categories };
  }

  /**
   * 문제 1개 요청 API
   * GET /api/singleplay/question?categoryId=1,2,3
   */
  @Get('question')
  @UseGuards(JwtAuthGuard)
  async getQuestion(@Query(ValidationPipe) query: GetQuestionDto) {
    const question = await this.singlePlayService.getQuestion(query.categoryId);

    return { question };
  }

  /**
   * 정답 제출 요청 API (채점 + DB 저장)
   * POST /api/singleplay/submit
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async submitAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) submitDto: SubmitAnswerDto,
  ) {
    return await this.singlePlayService.submitAnswer(
      user.id,
      submitDto.questionId,
      submitDto.answer,
    );
  }
}
