import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameGateway } from './game.gateway';
import { GameSessionManager } from './game-session-manager';
import { QuizModule } from '../quiz/quiz.module';
import { Match, Round, RoundAnswer } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';
import { UserStatistics } from '../user/entity';
import { UserTierHistory } from '../tier/entity';

import { RoundProgressionService } from './round-progression.service';
import { RoundTimer } from './round-timer';
import { MatchPersistenceService } from './match-persistence.service';

@Module({
  imports: [
    QuizModule,
    TypeOrmModule.forFeature([
      Match,
      Round,
      RoundAnswer,
      UserProblemBank,
      UserStatistics,
      UserTierHistory,
    ]),
  ],
  providers: [
    GameGateway,
    GameSessionManager,
    RoundProgressionService,
    RoundTimer,
    MatchPersistenceService,
  ],
  exports: [GameSessionManager, RoundProgressionService],
})
export class GameModule {}
