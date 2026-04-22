import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingSessionManager } from './matchmaking-session-manager';
import { RedisMatchQueue } from './queue/redis-match-queue';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GameModule, AuthModule],
  providers: [MatchmakingService, MatchmakingGateway, MatchmakingSessionManager, RedisMatchQueue],
  exports: [MatchmakingService, MatchmakingSessionManager],
})
export class MatchmakingModule {}
