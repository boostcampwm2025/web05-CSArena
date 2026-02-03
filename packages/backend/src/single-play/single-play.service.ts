import {
  BadRequestException,
  ForbiddenException,
  HttpException,
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
import { Match, Round, RoundAnswer } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';
import { calcLevel } from '../common/utils/level.util';
import { parseUserId } from '../common/utils/parse-user-id.util';

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
   * 싱글플레이 세션 시작
   */
  async startSession(userId: string): Promise<number> {
    try {
      const match = await this.connection.manager.save(Match, {
        player1Id: parseUserId(userId),
        player2Id: null,
        winnerId: null,
        matchType: 'single',
      });

      this.logger.log(`Single play session started for user ${userId}, matchId: ${match.id}`);

      return match.id;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to start session: ${(error as Error).message}`);
      throw new InternalServerErrorException('세션 시작 중 오류가 발생했습니다.');
    }
  }

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
      if (error instanceof HttpException) {
        throw error;
      }

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

      const question = questions[0];

      // 문제 사용 횟수 증가 (비동기, 에러 무시)
      this.quizService.incrementUsageCount(question.id).catch((err: Error) => {
        this.logger.warn(
          `Failed to increment usage count for question ${question.id}: ${err.message}`,
        );
      });

      return question;
    } catch (error) {
      if (error instanceof HttpException) {
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
    matchId: number,
    questionId: number,
    answer: string,
  ): Promise<{
    grade: { submittedAnswer: string; isCorrect: boolean; aiFeedback: string };
    level: number;
    needExpPoint: number;
    remainedExpPoint: number;
  }> {
    try {
      const question = await this.findQuestionById(questionId);
      const grade = await this.gradeAnswer(question, answer);
      const finalScore = this.calculateFinalScore(question, grade);

      const curExp = await this.saveAnswerResult(
        userId,
        matchId,
        questionId,
        question,
        answer,
        grade,
        finalScore,
      );

      this.logger.log(
        `Answer submitted for user ${userId}, matchId ${matchId}, question ${questionId}, score: ${finalScore}`,
      );

      const { level, needExpPoint, remainedExpPoint } = calcLevel(curExp);

      return {
        grade: {
          submittedAnswer: answer,
          isCorrect: grade.isCorrect,
          aiFeedback: grade.feedback,
        },
        level,
        needExpPoint,
        remainedExpPoint,
      };
    } catch (error) {
      if (error instanceof HttpException) {
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
   * 답안 결과 DB 저장
   */
  private async saveAnswerResult(
    userId: string,
    matchId: number,
    questionId: number,
    question: QuestionEntity,
    answer: string,
    grade: { isCorrect: boolean; score: number; feedback: string },
    finalScore: number,
  ): Promise<number> {
    return await this.connection.transaction(async (manager) => {
      const uid = parseUserId(userId);

      // matchId, 소유자, matchType 검증
      const match = await manager.findOne(Match, {
        where: { id: matchId },
      });

      if (!match) {
        throw new NotFoundException('존재하지 않는 세션입니다.');
      }

      // TypeORM이 bigint를 string으로 반환하므로 Number로 변환하여 비교
      const matchOwnerId = Number(match.player1Id);

      if (matchOwnerId !== uid) {
        throw new ForbiddenException('본인의 세션이 아닙니다.');
      }

      if (match.matchType !== 'single') {
        throw new BadRequestException('싱글플레이 세션이 아닙니다.');
      }

      const answerStatus = this.quizService.determineAnswerStatus(
        question.questionType,
        grade.isCorrect,
        grade.score,
      );

      const round = await manager.save(Round, {
        matchId: match.id,
        questionId: questionId,
        roundNumber: 1,
      });

      await manager.save(RoundAnswer, {
        roundId: round.id,
        userId: uid,
        userAnswer: answer,
        score: finalScore,
        answerStatus: answerStatus,
        aiFeedback: grade.feedback,
      });

      await manager.save(UserProblemBank, {
        userId: uid,
        questionId,
        matchId,
        userAnswer: answer,
        answerStatus,
        aiFeedback: grade.feedback,
      });

      const result: [{ exp_point: number }[], number] = await manager.query(
        `
        UPDATE user_statistics
        SET exp_point = COALESCE(exp_point, 0) + $1
        WHERE user_id = $2
        RETURNING exp_point
        `,
        [finalScore, uid],
      );

      const rows = result[0];
      const curExp = rows[0]?.exp_point ?? 0;

      return curExp;
    });
  }
}
