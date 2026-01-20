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
import { GetQuestionsDto, SubmitAnswerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('api/singleplay')
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
   * 문제 요청 API
   * GET /api/singleplay/questions?categoryId=1,2,3
   */
  @Get('questions')
  @UseGuards(JwtAuthGuard)
  async getQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: GetQuestionsDto,
  ) {
    const questions = await this.singlePlayService.getQuestions(user.id, query.categoryId);

    return { questions };
  }

  /**
   * 정답 제출 요청 API
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
