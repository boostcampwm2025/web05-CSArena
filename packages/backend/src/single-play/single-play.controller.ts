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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SinglePlayService } from './single-play.service';
import { GetQuestionDto, SubmitAnswerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('singleplay')
@Controller('singleplay')
export class SinglePlayController {
  constructor(private readonly singlePlayService: SinglePlayService) {}

  /**
   * 카테고리 목록 조회 API
   * GET /api/singleplay/categories
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '대분류 카테고리 목록 조회',
    description: '싱글플레이에서 선택 가능한 대분류 카테고리 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '카테고리 목록 조회 성공',
    schema: {
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: '데이터베이스' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '문제 조회',
    description: '선택한 카테고리에서 문제를 조회합니다.',
  })
  @ApiQuery({
    name: 'categoryId',
    description: '카테고리 ID 목록 (콤마로 구분)',
    example: '1,2,3',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '문제 조회 성공',
    schema: {
      properties: {
        question: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            type: { type: 'string', example: 'multiple_choice' },
            question: { type: 'string', example: 'HTTP와 HTTPS의 차이점은?' },
            difficulty: { type: 'string', example: 'easy' },
            category: {
              type: 'array',
              items: { type: 'string' },
              example: ['네트워크', 'HTTP'],
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '해당 카테고리에 문제가 없음' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '정답 제출',
    description: '문제에 대한 답안을 제출하고 채점 결과를 받습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '채점 완료',
    schema: {
      type: 'object',
      properties: {
        grade: {
          type: 'object',
          description: '해당 문제에 대한 채점 결과',
          properties: {
            answer: {
              type: 'string',
              example: 'A',
              description: '사용자가 제출한 답안',
            },
            isCorrect: {
              type: 'boolean',
              example: true,
              description: '정답 여부',
            },
            score: {
              type: 'number',
              example: 10,
              description: '해당 문제에서 획득한 점수',
            },
            feedback: {
              type: 'string',
              example: '정답입니다!',
              description: 'AI 피드백',
            },
          },
        },
        totalScore: {
          type: 'number',
          example: 30,
          description: '현재까지의 총 누적 점수',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '존재하지 않는 문제' })
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
