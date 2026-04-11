import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClovaClientService } from './clova/clova-client.service';
import { MockClovaClientService } from './clova/mock-clova-client.service';
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
    // Clova: GRADING_MODE=mock이면 MockClovaClientService 사용
    {
      provide: ClovaClientService,
      useFactory: (configService: ConfigService) => {
        const mode = configService.get<string>('GRADING_MODE');

        if (mode === 'mock') {
          return new MockClovaClientService();
        }

        return new ClovaClientService(configService);
      },
      inject: [ConfigService],
    },
    QuizSeedService,
  ],
  exports: [QuizService],
})
export class QuizModule {}
