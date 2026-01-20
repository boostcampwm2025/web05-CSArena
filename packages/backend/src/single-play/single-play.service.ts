import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Question as QuestionEntity } from '../quiz/entity';
import { QuizService } from '../quiz/quiz.service';
import { Question } from '../quiz/quiz.types';
import { mapDifficulty, SCORE_MAP } from '../quiz/quiz.constants';

@Injectable()
export class SinglePlayService {
  private readonly logger = new Logger(SinglePlayService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    private readonly quizService: QuizService,
  ) {}

  /**
   * 대분류 카테고리 목록 조회
   */
  async getCategories(): Promise<Array<{ id: number; name: string | null }>> {
    try {
      const categories = await this.categoryRepository.find({
        where: { parentId: null },
        select: ['id', 'name'],
        order: { id: 'ASC' },
      });

      return categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      }));
    } catch (error) {
      this.logger.error(`Failed to get categories: ${(error as Error).message}`);
      throw new InternalServerErrorException('카테고리 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 선택한 카테고리의 문제 10개 생성
   */
  async getQuestions(categoryIds: number[]): Promise<Question[]> {
    try {
      // 카테고리 존재 여부 확인
      const existingCategories = await this.categoryRepository.find({
        where: categoryIds.map((id) => ({ id })),
        select: ['id'],
      });

      // 요청한 카테고리 개수와 실제 존재하는 개수가 다르면 에러
      if (existingCategories.length !== categoryIds.length) {
        const existingIds = existingCategories.map((cat) => cat.id);
        const missingIds = categoryIds.filter((id) => !existingIds.includes(id));
        throw new NotFoundException(`존재하지 않는 카테고리가 있습니다: ${missingIds.join(', ')}`);
      }

      // QuizService를 통해 문제 생성
      return await this.quizService.generateSinglePlayQuestions(categoryIds, 10);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to get questions: ${(error as Error).message}`);
      throw new InternalServerErrorException('문제 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 답안 제출 및 채점
   */
  async submitAnswer(
    questionId: number,
    answer: string,
  ): Promise<{
    grade: {
      answer: string;
      isCorrect: boolean;
      score: number;
      feedback: string;
    };
    totalScore: number;
  }> {
    try {
      // 문제 조회
      const question = await this.questionRepository.findOne({
        where: { id: questionId },
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
          playerId: 'single-player',
          answer,
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
