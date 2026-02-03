import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClovaClientService } from './clova/clova-client.service';
import { Category, CategoryQuestion, Question } from './entity';
import { QuizSeedService } from './seed';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import {
  GradingService,
  QuestionConverterService,
  QuestionRepositoryService,
  ScoreCalculatorService,
} from './services';
import {
  EssayStrategy,
  MultipleChoiceStrategy,
  QUESTION_TYPE_STRATEGIES,
  ShortAnswerStrategy,
} from './strategies';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Category, Question, CategoryQuestion])],
  controllers: [QuizController],
  providers: [
    // Strategies
    MultipleChoiceStrategy,
    ShortAnswerStrategy,
    EssayStrategy,
    {
      provide: QUESTION_TYPE_STRATEGIES,
      useFactory: (
        multipleChoice: MultipleChoiceStrategy,
        shortAnswer: ShortAnswerStrategy,
        essay: EssayStrategy,
      ) => [multipleChoice, shortAnswer, essay],
      inject: [MultipleChoiceStrategy, ShortAnswerStrategy, EssayStrategy],
    },
    // Services
    ScoreCalculatorService,
    QuestionRepositoryService,
    QuestionConverterService,
    GradingService,
    // Facade
    QuizService,
    // Others
    ClovaClientService,
    QuizSeedService,
  ],
  exports: [QuizService],
})
export class QuizModule {}
