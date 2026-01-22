import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserProblemBank } from '../entity/user-problem-bank.entity';
import { User } from '../../user/entity';
import { Question } from '../../quiz/entity';
import { Match } from '../../match/entity';
import { SEED_PROBLEM_BANK_ITEMS } from './seed-data';

@Injectable()
export class ProblemBankSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(UserProblemBank)
    private readonly problemBankRepository: Repository<UserProblemBank>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'production');

    if (nodeEnv !== 'development') {
      return;
    }

    await this.seed();
  }

  async seed() {
    try {
      const count = await this.problemBankRepository.count();

      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log('[ProblemBankSeed] Data already exists. Skipping seed.');

        return;
      }

      // eslint-disable-next-line no-console
      console.log('[ProblemBankSeed] Starting seed process...');

      // 1. 테스트용 User 생성 또는 기존 User 사용
      let testUser = await this.userRepository.findOne({ where: {} });

      if (!testUser) {
        testUser = await this.userRepository.save({
          nickname: 'TestUser',
          email: 'test@example.com',
          oauthProvider: 'google',
          oauthId: 'test-oauth-id',
        });
        // eslint-disable-next-line no-console
        console.log(
          `[ProblemBankSeed] Created test user: ${testUser.nickname} (ID: ${testUser.id})`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `[ProblemBankSeed] Using existing user: ${testUser.nickname} (ID: ${testUser.id})`,
        );
      }

      // 2. 기존 Question들 가져오기 (Quiz Seed에서 생성됨)
      const questions = await this.questionRepository.find({
        take: SEED_PROBLEM_BANK_ITEMS.length,
        order: { id: 'ASC' },
      });

      if (questions.length < SEED_PROBLEM_BANK_ITEMS.length) {
        // eslint-disable-next-line no-console
        console.warn(
          `[ProblemBankSeed] Not enough questions in DB. Expected ${SEED_PROBLEM_BANK_ITEMS.length}, found ${questions.length}`,
        );
        // eslint-disable-next-line no-console
        console.warn('[ProblemBankSeed] Please run Quiz Seed first.');

        return;
      }

      // 3. 테스트용 Match들 생성
      const matches: Match[] = [];

      for (let i = 0; i < SEED_PROBLEM_BANK_ITEMS.length; i++) {
        const match = await this.matchRepository.save({
          player1Id: testUser.id,
          player2Id: null, // 싱글 플레이어
          winnerId: testUser.id,
          matchType: 'single',
        });
        matches.push(match);
      }

      // eslint-disable-next-line no-console
      console.log(`[ProblemBankSeed] Created ${matches.length} matches`);

      // 4. UserProblemBank 데이터 생성
      let createdCount = 0;

      for (let i = 0; i < SEED_PROBLEM_BANK_ITEMS.length; i++) {
        const seedItem = SEED_PROBLEM_BANK_ITEMS[i];
        const question = questions[i];
        const match = matches[i];

        const problemBankItem = this.problemBankRepository.create({
          userId: testUser.id,
          questionId: question.id,
          matchId: match.id,
          userAnswer: seedItem.userAnswer,
          answerStatus: seedItem.answerStatus,
          isBookmarked: seedItem.isBookmarked,
          aiFeedback: seedItem.aiFeedback,
        });

        await this.problemBankRepository.save(problemBankItem);
        createdCount++;
      }

      // eslint-disable-next-line no-console
      console.log(`[ProblemBankSeed] Created ${createdCount} problem bank items`);
      // eslint-disable-next-line no-console
      console.log('[ProblemBankSeed] Seed completed successfully!');
      // eslint-disable-next-line no-console
      console.log(
        `[ProblemBankSeed] Statistics: 8 correct, 6 incorrect, 1 partial (53.3% correct rate)`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[ProblemBankSeed] Seed failed:', errorMessage);

      if (error instanceof Error && error.stack) {
        // eslint-disable-next-line no-console
        console.error('[ProblemBankSeed] Stack trace:', error.stack);
      }
    }
  }
}
