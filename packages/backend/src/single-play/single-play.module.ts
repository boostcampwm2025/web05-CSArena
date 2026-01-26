import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinglePlayController } from './single-play.controller';
import { SinglePlayService } from './single-play.service';
import { Category, Question } from '../quiz/entity';
import { Match } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';
import { QuizService } from '../quiz/quiz.service';
import { ClovaClientService } from '../quiz/clova/clova-client.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Question, Match, UserProblemBank]), AuthModule],
  controllers: [SinglePlayController],
  providers: [SinglePlayService, QuizService, ClovaClientService],
})
export class SinglePlayModule {}
