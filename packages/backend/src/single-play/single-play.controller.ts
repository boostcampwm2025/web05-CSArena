import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Question as QuestionEntity } from '../quiz/entity';
import { QuizService } from '../quiz/quiz.service';
import { GetQuestionsDto, SubmitAnswerDto } from './dto';
import { Question } from '../quiz/quiz.types';
import { mapDifficulty, SCORE_MAP } from '../quiz/quiz.constants';

@Controller('api/singleplay')
export class SinglePlayController {
  private readonly logger = new Logger(SinglePlayController.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    private readonly quizService: QuizService,
  ) {}

  /**
   * 1. 카테고리 목록 조회 API
   * GET /api/singleplay/categories
   */
  @Get('categories')
  async getCategories(): Promise<{ categories: Array<{ id: number; name: string | null }> }> {
    try {
      // parent_id가 null인 대분류 카테고리만 조회
      const categories = await this.categoryRepository.find({
        where: { parentId: null },
        select: ['id', 'name'],
        order: { id: 'ASC' },
      });

      if (categories.length === 0) {
        return {
          categories: [],
        };
      }

      return {
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get categories: ${(error as Error).message}`);
      throw new InternalServerErrorException('카테고리 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 2. 문제 요청 API
   * GET /api/singleplay/questions?categoryId=1,2,3
   */
  @Get('questions')
  async getQuestions(
    @Query(ValidationPipe) query: GetQuestionsDto,
  ): Promise<{ questions: Question[] }> {
    try {
      // 쉼표로 구분된 categoryId를 배열로 변환
      const categoryIds = query.categoryId
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));

      if (categoryIds.length === 0) {
        throw new NotFoundException('유효한 카테고리 ID가 없습니다.');
      }

      // 카테고리 존재 여부 확인
      const existingCategories = await this.categoryRepository.find({
        where: categoryIds.map((id) => ({ id })),
        select: ['id'],
      });

      if (existingCategories.length === 0) {
        throw new NotFoundException('존재하지 않는 카테고리입니다.');
      }

      // QuizService를 통해 문제 생성
      const questions = await this.quizService.generateSinglePlayQuestions(categoryIds, 10);

      if (questions.length === 0) {
        return { questions: [] };
      }

      return { questions };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to get questions: ${(error as Error).message}`);

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('문제 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 3. 정답 제출 요청 API
   * POST /api/singleplay/submit
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(@Body(ValidationPipe) submitDto: SubmitAnswerDto) {
    try {
      // 문제 조회
      const question = await this.questionRepository.findOne({
        where: { id: submitDto.questionId },
        relations: [
          'categoryQuestions',
          'categoryQuestions.category',
          'categoryQuestions.category.parent',
        ],
      });

      if (!question) {
        throw new NotFoundException('존재하지 않는 문제입니다.');
      }

      // 채점
      const submissions = [
        {
          playerId: 'single-player', // 싱글 플레이는 playerId 불필요
          answer: submitDto.answer,
          submittedAt: Date.now(),
        },
      ];

      const gradeResults = await this.quizService.gradeQuestion(question, submissions);
      const grade = gradeResults[0];

      // 난이도별 점수 환산
      const difficulty = mapDifficulty(question.difficulty);

      const totalScore = grade.isCorrect
        ? Math.round((grade.score / 10) * SCORE_MAP[difficulty])
        : 0;

      return {
        grade: {
          answer: grade.answer,
          isCorrect: grade.isCorrect,
          score: grade.score,
          feedback: grade.feedback,
        },
        totalScore,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to submit answer: ${(error as Error).message}`);
      throw new InternalServerErrorException('채점 중 오류가 발생했습니다.');
    }
  }
}
