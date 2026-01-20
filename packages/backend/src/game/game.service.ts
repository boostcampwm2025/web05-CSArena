import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { GameSessionManager } from './game-session-manager';
import { QuizService } from '../quiz/quiz.service';
import { UserInfo } from './interfaces/user.interface';
import { FinalResult, GameSession, RoundData } from './interfaces/game.interfaces';
import { RoundResult } from '../quiz/quiz.types';
import { mapDifficulty, SCORE_MAP, SPEED_BONUS } from '../quiz/quiz.constants';
import { Match, Round, RoundAnswer } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Round)
    private readonly roundRepo: Repository<Round>,
    @InjectRepository(RoundAnswer)
    private readonly answerRepo: Repository<RoundAnswer>,
    private readonly connection: DataSource,
    private readonly sessionManager: GameSessionManager,
    private readonly quizService: QuizService,
  ) {}

  /**
   * 매칭 성공 후 게임 세션 생성
   */
  startGameFromMatch(
    roomId: string,
    player1Id: string,
    player1SocketId: string,
    player1Info: UserInfo,
    player2Id: string,
    player2SocketId: string,
    player2Info: UserInfo,
  ): void {
    // 게임 세션 생성
    this.sessionManager.createGameSession(
      roomId,
      player1Id,
      player1SocketId,
      player1Info,
      player2Id,
      player2SocketId,
      player2Info,
    );
  }

  // ============================================
  // Game Logic
  // ============================================

  /**
   * 라운드 시작
   */
  async startRound(roomId: string): Promise<RoundData> {
    const roundData = this.sessionManager.startNextRound(roomId);

    // DB에서 Question 엔티티 조회
    const questions = await this.quizService.getQuestionsForGame();

    const targetQuestion = questions[(roundData.roundNumber - 1) % questions.length];

    this.sessionManager.setQuestion(roomId, targetQuestion);

    return this.sessionManager.getRoundData(roomId, roundData.roundNumber);
  }

  async submitAnswer(
    roomId: string,
    playerId: string,
    answer: string,
  ): Promise<RoundResult | { status: string }> {
    this.sessionManager.submitAnswer(roomId, playerId, answer);

    if (this.sessionManager.isAllSubmitted(roomId)) {
      return await this.processGrading(roomId);
    }

    return { status: 'waiting_for_others' };
  }

  /**
   * 채점 및 결과 처리 프로세스
   */
  async processGrading(roomId: string): Promise<RoundResult> {
    const { question, submissions } = this.sessionManager.getGradingInput(roomId);

    // QuizService에 채점 위임
    const gradeResults = await this.quizService.gradeQuestion(question, submissions);

    // 제출 시간 기반 보너스 계산 - 정답자 중 가장 빠른 사람 찾기
    const correctSubmissions = gradeResults
      .filter((grade) => grade.isCorrect)
      .map((grade) => ({
        playerId: grade.playerId,
        submittedAt: submissions.find((sub) => sub.playerId === grade.playerId).submittedAt,
      }));

    const fastestCorrectSubmission =
      correctSubmissions.length > 0
        ? correctSubmissions.reduce((fastest, current) =>
            current.submittedAt < fastest.submittedAt ? current : fastest,
          )
        : null;

    // 점수 반영
    const difficulty = mapDifficulty(question.difficulty);
    const finalGrades = gradeResults.map((grade) => {
      let score = 0;

      if (grade.isCorrect) {
        // AI가 준 점수(0~10)를 난이도별 만점 기준으로 비율 계산
        const aiScore = grade.score; // 0~10점
        const maxScore = SCORE_MAP[difficulty]; // 10, 20, 30
        // 비율 적용: (AI점수 / 10) * 난이도 만점
        score = Math.round((aiScore / 10) * maxScore);
      }

      // 정답자 중 가장 빨리 제출한 경우 보너스 점수 추가
      if (
        grade.isCorrect &&
        fastestCorrectSubmission &&
        grade.playerId === fastestCorrectSubmission.playerId
      ) {
        score += SPEED_BONUS;
      }

      if (score > 0) {
        this.sessionManager.addScore(roomId, grade.playerId, score);
      }

      return { ...grade, score };
    });

    // 현재 라운드 정보 확인
    const session = this.sessionManager.getGameSession(roomId);
    const isLastRound = session.currentRound === session.totalRounds;

    // 결과 객체 생성
    const roundResult: RoundResult = {
      roundNumber: session.currentRound,
      grades: finalGrades,
    };

    // 마지막 라운드라면 최종 승자 판별 로직 수행
    if (isLastRound) {
      roundResult.finalResult = this.calculateFinalResult(roomId);
    }

    // 결과 저장 및 반환
    this.sessionManager.setRoundResult(roomId, roundResult);

    return roundResult;
  }

  /**
   * 최종 승자 계산 로직
   */
  calculateFinalResult(roomId: string): FinalResult {
    const session = this.sessionManager.getGameSession(roomId);

    if (!session) {
      throw new Error('Session not found');
    }

    const { player1Score, player2Score } = this.sessionManager.getScores(roomId);

    const scores = {
      [session.player1Id]: player1Score,
      [session.player2Id]: player2Score,
    };

    let winnerId: string | null = null;
    let isDraw = false;

    // 단순 비교 로직
    if (player1Score > player2Score) {
      winnerId = session.player1Id;
    } else if (player2Score > player1Score) {
      winnerId = session.player2Id;
    } else {
      isDraw = true;
    }

    return {
      winnerId,
      scores,
      isDraw,
    };
  }

  // ============================================
  // Database Persistence
  // ============================================

  /**
   * 매치 종료 후 DB에 결과 저장 (Batch INSERT)
   */
  async saveMatchToDatabase(roomId: string): Promise<void> {
    const session = this.sessionManager.getGameSession(roomId);
    const finalResult = this.calculateFinalResult(roomId);

    await this.connection.transaction(async (manager) => {
      const matchId = await this.insertMatch(manager, session, finalResult);
      const roundIdMap = await this.insertRounds(manager, matchId, session);
      await this.insertRoundAnswers(manager, roundIdMap, session);
      await this.insertUserProblemBanks(manager, matchId, session);
    });
  }

  /**
   * Match 테이블에 INSERT
   */
  private async insertMatch(
    manager: EntityManager,
    session: GameSession,
    finalResult: FinalResult,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Match)
      .values({
        player1Id: this.parseUserId(session.player1Id),
        player2Id: this.parseUserId(session.player2Id),
        winnerId: finalResult.winnerId ? this.parseUserId(finalResult.winnerId) : null,
        matchType: 'multi',
      })
      .returning('id')
      .execute();

    return result.generatedMaps[0].id as number;
  }

  /**
   * Rounds 테이블에 Bulk INSERT
   */
  private async insertRounds(
    manager: EntityManager,
    matchId: number,
    session: GameSession,
  ): Promise<Map<number, number>> {
    const roundsData = Array.from(session.rounds.entries()).map(([roundNum, roundData]) => ({
      matchId,
      questionId: roundData.questionId,
      roundNumber: roundNum,
    }));

    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Round)
      .values(roundsData)
      .returning(['id', 'roundNumber'])
      .execute();

    const roundIdMap = new Map<number, number>();
    result.generatedMaps.forEach((r) => {
      roundIdMap.set(r.roundNumber as number, r.id as number);
    });

    return roundIdMap;
  }

  /**
   * RoundAnswers 테이블에 Bulk INSERT
   */
  private async insertRoundAnswers(
    manager: EntityManager,
    roundIdMap: Map<number, number>,
    session: GameSession,
  ): Promise<void> {
    const answersData = this.prepareRoundAnswersData(roundIdMap, session);

    if (answersData.length > 0) {
      await manager.createQueryBuilder().insert().into(RoundAnswer).values(answersData).execute();
    }
  }

  /**
   * RoundAnswers INSERT용 데이터 준비
   */
  private prepareRoundAnswersData(
    roundIdMap: Map<number, number>,
    session: GameSession,
  ): Partial<RoundAnswer>[] {
    const answersData: Partial<RoundAnswer>[] = [];

    for (const [roundNum, roundData] of session.rounds.entries()) {
      const roundId = roundIdMap.get(roundNum);
      const questionType = roundData.question?.questionType;

      for (const [playerId, submission] of Object.entries(roundData.submissions)) {
        if (!submission) {
          continue;
        }

        const grade = roundData.result?.grades.find((g) => g.playerId === playerId);

        if (!grade) {
          continue;
        }

        answersData.push({
          userId: this.parseUserId(playerId),
          roundId,
          userAnswer: submission.answer || '',
          score: grade.score,
          answerStatus: this.quizService.determineAnswerStatus(
            questionType,
            grade.isCorrect,
            grade.score,
          ),
          aiFeedback: grade.feedback,
        });
      }
    }

    return answersData;
  }

  /**
   * UserProblemBanks 테이블에 Bulk INSERT
   */
  private async insertUserProblemBanks(
    manager: EntityManager,
    matchId: number,
    session: GameSession,
  ): Promise<void> {
    const problemBanksData = this.prepareProblemBanksData(matchId, session);

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
    session: GameSession,
  ): Partial<UserProblemBank>[] {
    const problemBanksData: Partial<UserProblemBank>[] = [];

    for (const [, roundData] of session.rounds.entries()) {
      const questionType = roundData.question?.questionType;

      for (const [playerId, submission] of Object.entries(roundData.submissions)) {
        if (!submission) {
          continue;
        }

        const grade = roundData.result?.grades.find((g) => g.playerId === playerId);

        if (!grade) {
          continue;
        }

        problemBanksData.push({
          userId: this.parseUserId(playerId),
          questionId: roundData.questionId,
          matchId,
          userAnswer: submission.answer || '',
          answerStatus: this.quizService.determineAnswerStatus(
            questionType,
            grade.isCorrect,
            grade.score,
          ),
          aiFeedback: grade.feedback,
        });
      }
    }

    return problemBanksData;
  }

  // ============================================
  // Utilities
  // ============================================

  private parseUserId(userId: string): number {
    const parsed = parseInt(userId, 10);

    if (isNaN(parsed)) {
      throw new Error(`Invalid userId: ${userId}`);
    }

    return parsed;
  }
}
