import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { InMemoryMatchQueue } from './queue/in-memory-queue';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingSessionManager } from './matchmaking-session-manager';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  providers: [
    MatchmakingService,
    InMemoryMatchQueue,
    MatchmakingGateway,
    MatchmakingSessionManager,
  ],
  exports: [MatchmakingService, MatchmakingSessionManager],
})
export class MatchmakingModule {}
