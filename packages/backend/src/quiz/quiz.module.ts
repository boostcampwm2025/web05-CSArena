import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClovaClientService } from './clova/clova-client.service';
import { QuizGameService } from './quiz-game.service';
import { QuizRoundStore } from './quiz-round.store';
import { Category, CategoryQuestion, Question } from './entity';
import { QuizSeedService } from './seed';
import { QuizService } from './quiz.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Category, Question, CategoryQuestion])],
  controllers: [],
  providers: [QuizGameService, QuizService, ClovaClientService, QuizRoundStore, QuizSeedService],
})
export class QuizModule {}
