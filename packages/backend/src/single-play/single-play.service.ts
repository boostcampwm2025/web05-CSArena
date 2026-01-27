import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Category, Question as QuestionEntity } from '../quiz/entity';
import { QuizService } from '../quiz/quiz.service';
import { Question } from '../quiz/quiz.types';
import { mapDifficulty, SCORE_MAP } from '../quiz/quiz.constants';
import { Match } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';

@Injectable()
export class SinglePlayService {
  private readonly logger = new Logger(SinglePlayService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    private readonly connection: DataSource,
    private readonly quizService: QuizService,
  ) {}

  /**
   * 대분류 카테고리 목록 조회
   */
  async getCategories(): Promise<Array<{ id: number; name: string | null }>> {
    try {
      const categories = await this.categoryRepository.find({
        where: { parentId: IsNull() },
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
   * 선택한 카테고리에서 문제 1개 조회
   */
  async getQuestion(categoryIds: number[]): Promise<Question> {
    try {
      await this.validateCategories(categoryIds);

      const questions = await this.quizService.generateSinglePlayQuestions(categoryIds, 1);

      if (questions.length === 0) {
        throw new NotFoundException('해당 카테고리에 문제가 없습니다.');
      }

      return questions[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to get question: ${(error as Error).message}`);
      throw new InternalServerErrorException('문제 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 카테고리 존재 여부 검증
   */
  private async validateCategories(categoryIds: number[]): Promise<void> {
    const existingCategories = await this.categoryRepository.find({
      where: categoryIds.map((id) => ({ id })),
      select: ['id'],
    });

    if (existingCategories.length !== categoryIds.length) {
      const existingIds = existingCategories.map((cat) => cat.id);
      const missingIds = categoryIds.filter((id) => !existingIds.includes(id));
      throw new NotFoundException(`존재하지 않는 카테고리가 있습니다: ${missingIds.join(', ')}`);
    }
  }

  /**
   * 답안 제출, 채점, DB 저장
   */
  async submitAnswer(
    userId: string,
    questionId: number,
    answer: string,
  ): Promise<{
    score: number;
    grade: { submittedAnswer: string; isCorrect: boolean; aiFeedback: string };
  }> {
    try {
      const question = await this.findQuestionById(questionId);
      const grade = await this.gradeAnswer(question, answer);
      const finalScore = this.calculateFinalScore(question, grade);

      await this.saveAnswerResult(userId, questionId, question, answer, grade);

      this.logger.log(
        `Answer submitted for user ${userId}, question ${questionId}, score: ${finalScore}`,
      );

      return {
        score: finalScore,
        grade: {
          submittedAnswer: answer,
          isCorrect: grade.isCorrect,
          aiFeedback: grade.feedback,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to submit answer: ${(error as Error).message}`);
      throw new InternalServerErrorException('채점 중 오류가 발생했습니다.');
    }
  }

  /**
   * 문제 조회
   */
  private async findQuestionById(questionId: number): Promise<QuestionEntity> {
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

    return question;
  }

  /**
   * 답안 채점
   */
  private async gradeAnswer(question: QuestionEntity, answer: string) {
    const submissions = [
      {
        playerId: 'single-player',
        answer,
        submittedAt: Date.now(),
      },
    ];

    const gradeResults = await this.quizService.gradeQuestion(question, submissions);

    return gradeResults[0];
  }

  /**
   * 난이도별 최종 점수 계산
   */
  private calculateFinalScore(
    question: QuestionEntity,
    grade: { isCorrect: boolean; score: number },
  ): number {
    if (!grade.isCorrect) {
      return 0;
    }

    const difficulty = mapDifficulty(question.difficulty);

    return Math.round((grade.score / 10) * SCORE_MAP[difficulty]);
  }

  /**
   * 답안 결과 DB 저장 (트랜잭션)
   */
  private async saveAnswerResult(
    userId: string,
    questionId: number,
    question: QuestionEntity,
    answer: string,
    grade: { isCorrect: boolean; score: number; feedback: string },
  ): Promise<void> {
    await this.connection.transaction(async (manager) => {
      const match = await manager.save(Match, {
        player1Id: this.parseUserId(userId),
        player2Id: null,
        winnerId: null,
        matchType: 'single',
      });

      const answerStatus = this.quizService.determineAnswerStatus(
        question.questionType,
        grade.isCorrect,
        grade.score,
      );

      await manager.save(UserProblemBank, {
        userId: this.parseUserId(userId),
        questionId,
        matchId: match.id,
        userAnswer: answer,
        answerStatus,
        aiFeedback: grade.feedback,
      });
    });
  }

  private parseUserId(userId: string): number {
    const parsed = parseInt(userId, 10);

    if (isNaN(parsed)) {
      throw new Error(`유효하지 않은 userId: ${userId}`);
    }

    return parsed;
  }
}
