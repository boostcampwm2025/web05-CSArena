import { Injectable, Logger } from '@nestjs/common';

import { Question as QuestionEntity } from '../entity';
import { mapDifficulty, QUIZ_ERROR_MESSAGES, QUIZ_LOG_MESSAGES } from '../quiz.constants';
import { EssayQuestion } from '../quiz.types';
import { QuestionTypeStrategy } from './question-type.strategy';

@Injectable()
export class EssayStrategy implements QuestionTypeStrategy {
  private readonly logger = new Logger(EssayStrategy.name);

  readonly type = 'essay' as const;
  readonly gameType = 'essay' as const;

  convert(entity: QuestionEntity): EssayQuestion {
    if (!entity.correctAnswer) {
      this.logger.error(QUIZ_LOG_MESSAGES.ESSAY_ANSWER_MISSING(entity.id));

      throw new Error(QUIZ_ERROR_MESSAGES.ESSAY_ANSWER_MISSING(entity.id));
    }

    const questionText = this.extractQuestionText(entity.content);

    return {
      id: entity.id,
      type: 'essay',
      question: questionText,
      difficulty: mapDifficulty(entity.difficulty),
      category: this.extractCategory(entity),
      sampleAnswer: entity.correctAnswer,
    };
  }

  getScoreDescription(): string {
    return '서술형 문제: 0~10점 사이의 부분 점수';
  }

  getIsCorrectDescription(): string {
    return '7점 이상이면 true, 7점 미만이면 false';
  }

  extractAnswer(entity: QuestionEntity): string {
    return entity.correctAnswer;
  }

  private extractQuestionText(content: string | object): string {
    if (typeof content === 'string') {
      return content;
    }

    return JSON.stringify(content);
  }

  private extractCategory(question: QuestionEntity): string[] {
    if (!question.categoryQuestions || question.categoryQuestions.length === 0) {
      return ['미분류', '미분류'];
    }

    const category = question.categoryQuestions[0].category;
    const parentName = category.parent?.name || '미분류';
    const childName = category.name;

    return [parentName, childName];
  }
}
