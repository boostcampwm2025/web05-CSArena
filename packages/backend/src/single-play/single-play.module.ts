import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinglePlayController } from './single-play.controller';
import { SinglePlayService } from './single-play.service';
import { SinglePlaySessionManager } from './single-play-session-manager';
import { Category, Question } from '../quiz/entity';
import { QuizService } from '../quiz/quiz.service';
import { ClovaClientService } from '../quiz/clova/clova-client.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Question]), AuthModule],
  controllers: [SinglePlayController],
  providers: [SinglePlayService, SinglePlaySessionManager, QuizService, ClovaClientService],
})
export class SinglePlayModule {}
