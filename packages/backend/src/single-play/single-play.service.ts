import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Category, Question as QuestionEntity } from '../quiz/entity';
import { QuizService } from '../quiz/quiz.service';
import { Question } from '../quiz/quiz.types';
import { mapDifficulty, SCORE_MAP } from '../quiz/quiz.constants';
import { SinglePlaySessionManager } from './single-play-session-manager';
import { SinglePlayGame } from './domain/single-play-game';
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
    private readonly sessionManager: SinglePlaySessionManager,
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
   * 선택한 카테고리의 문제 10개 생성 및 게임 시작
   */
  async getQuestions(userId: string, categoryIds: number[]): Promise<Question[]> {
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
      const questions = await this.quizService.generateSinglePlayQuestions(categoryIds, 10);

      // 새 게임 시작
      const questionIds = questions.map((q) => q.id);
      this.sessionManager.createGame(userId, categoryIds, questionIds);

      return questions;
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
    userId: string,
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
      // 게임 조회 및 문제 검증
      const game = this.sessionManager.findGameOrThrow(userId);
      game.validateQuestion(questionId);

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
      const currentScore = grade.isCorrect
        ? Math.round((grade.score / 10) * SCORE_MAP[difficulty])
        : 0;

      // 게임에 답안 저장
      game.submitAnswer(questionId, answer, grade.isCorrect, currentScore, grade.feedback);

      // 모든 문제를 풀었으면 게임 완료 처리
      if (game.isAllAnswered()) {
        game.complete();
        this.logger.log(`Game completed for user ${userId}. Final score: ${game.getTotalScore()}`);
      }

      return {
        grade: {
          answer: grade.answer,
          isCorrect: grade.isCorrect,
          score: grade.score,
          feedback: grade.feedback,
        },
        totalScore: game.getTotalScore(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to submit answer: ${(error as Error).message}`);
      throw new InternalServerErrorException('채점 중 오류가 발생했습니다.');
    }
  }

  // ============================================
  // Database Persistence
  // ============================================

  /**
   * 게임 종료 후 DB에 결과 저장 (트랜잭션)
   */
  async saveGameToDatabase(userId: string): Promise<void> {
    const game = this.sessionManager.findGameOrThrow(userId);

    // questionIds로 QuestionEntity 조회 (questionType 필요)
    const questions = await this.questionRepository.find({
      where: { id: In(game.questionIds) },
      select: ['id', 'questionType'],
    });
    const questionTypeMap = new Map(questions.map((q) => [q.id, q.questionType]));

    await this.connection.transaction(async (manager) => {
      const matchId = await this.insertMatch(manager, game);
      await this.insertUserProblemBanks(manager, matchId, game, questionTypeMap);
    });

    this.logger.log(`싱글 플레이 게임 결과 저장 완료: userId=${userId}`);
  }

  /**
   * Match 테이블에 INSERT
   */
  private async insertMatch(manager: EntityManager, game: SinglePlayGame): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Match)
      .values({
        player1Id: this.parseUserId(game.userId),
        player2Id: null,
        winnerId: null,
        matchType: 'single',
      })
      .returning('id')
      .execute();

    return result.generatedMaps[0].id as number;
  }

  /**
   * UserProblemBanks 테이블에 Bulk INSERT
   */
  private async insertUserProblemBanks(
    manager: EntityManager,
    matchId: number,
    game: SinglePlayGame,
    questionTypeMap: Map<number, string | null>,
  ): Promise<void> {
    const problemBanksData = this.prepareProblemBanksData(matchId, game, questionTypeMap);

    if (problemBanksData.length > 0) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserProblemBank)
        .values(problemBanksData)
        .execute();
    }
  }

  /**
   * UserProblemBanks INSERT용 데이터 준비
   */
  private prepareProblemBanksData(
    matchId: number,
    game: SinglePlayGame,
    questionTypeMap: Map<number, string | null>,
  ): Partial<UserProblemBank>[] {
    const problemBanksData: Partial<UserProblemBank>[] = [];
    const userId = this.parseUserId(game.userId);

    for (const [questionId, submission] of game.answers) {
      const questionType = questionTypeMap.get(questionId);

      if (!questionType) {
        this.logger.warn(`문제 타입을 찾을 수 없어 저장을 건너뜁니다: questionId=${questionId}`);
        continue;
      }

      problemBanksData.push({
        userId,
        questionId,
        matchId,
        userAnswer: submission.answer || '',
        answerStatus: this.quizService.determineAnswerStatus(
          questionType,
          submission.isCorrect,
          submission.score,
        ),
        aiFeedback: submission.feedback,
      });
    }

    return problemBanksData;
  }

  private parseUserId(userId: string): number {
    const parsed = parseInt(userId, 10);

    if (isNaN(parsed)) {
      throw new Error(`유효하지 않은 userId: ${userId}`);
    }

    return parsed;
  }
}
