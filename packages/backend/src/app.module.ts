import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchModule } from './match/match.module';

@Module({
  imports: [MatchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
