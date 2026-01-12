import { Module } from '@nestjs/common';
import { MatchGateway } from './match.gateway';
import { MatchService } from './match.service';
import { MatchSessionManager } from './match-session-manager';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [QuizModule],
  providers: [MatchGateway, MatchService, MatchSessionManager],
  exports: [MatchSessionManager],
})
export class MatchModule {}
