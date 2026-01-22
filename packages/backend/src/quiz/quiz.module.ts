import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClovaClientService } from './clova/clova-client.service';
import { Category, CategoryQuestion, Question } from './entity';
import { QuizSeedService } from './seed';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Category, Question, CategoryQuestion])],
  controllers: [QuizController],
  providers: [QuizService, ClovaClientService, QuizSeedService],
  exports: [QuizService],
})
export class QuizModule {}
