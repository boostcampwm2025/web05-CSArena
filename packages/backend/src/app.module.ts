import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchModule } from './match/match.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [MatchModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
