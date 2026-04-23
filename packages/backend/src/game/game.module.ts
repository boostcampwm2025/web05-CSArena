import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
import { GameCommandBus } from './game-command-bus';
import { MATCH_PERSISTENCE_QUEUE, ROUND_TIMER_QUEUE } from './queues/queue.constants';
import { RoundTimerWorker } from './workers/round-timer.worker';
import { MatchPersistenceWorker } from './workers/match-persistence.worker';

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
    BullModule.registerQueue({ name: ROUND_TIMER_QUEUE }, { name: MATCH_PERSISTENCE_QUEUE }),
  ],
  providers: [
    GameGateway,
    GameSessionManager,
    RoundProgressionService,
    RoundTimer,
    MatchPersistenceService,
    GameCommandBus,
    RoundTimerWorker,
    MatchPersistenceWorker,
  ],
  exports: [GameSessionManager, RoundProgressionService],
})
export class GameModule {}
