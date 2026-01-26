import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingSessionManager } from './matchmaking-session-manager';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GameModule, AuthModule],
  providers: [MatchmakingService, MatchmakingGateway, MatchmakingSessionManager],
  exports: [MatchmakingService, MatchmakingSessionManager],
})
export class MatchmakingModule {}
