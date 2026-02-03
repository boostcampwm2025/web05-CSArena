import { Injectable, Logger } from '@nestjs/common';

import { Question as QuestionEntity } from '../entity';
import { mapDifficulty, QUIZ_ERROR_MESSAGES, QUIZ_LOG_MESSAGES } from '../quiz.constants';
import { ShortAnswerQuestion } from '../quiz.types';
import { QuestionTypeStrategy } from './question-type.strategy';

@Injectable()
export class ShortAnswerStrategy implements QuestionTypeStrategy {
  private readonly logger = new Logger(ShortAnswerStrategy.name);

  readonly type = 'short' as const;
  readonly gameType = 'short_answer' as const;

  convert(entity: QuestionEntity): ShortAnswerQuestion {
    if (!entity.correctAnswer) {
      this.logger.error(QUIZ_LOG_MESSAGES.SHORT_ANSWER_MISSING(entity.id));

      throw new Error(QUIZ_ERROR_MESSAGES.SHORT_ANSWER_MISSING(entity.id));
    }

    const questionText = this.extractQuestionText(entity.content);

    return {
      id: entity.id,
      type: 'short_answer',
      question: questionText,
      difficulty: mapDifficulty(entity.difficulty),
      category: this.extractCategory(entity),
      answer: entity.correctAnswer,
    };
  }

  getScoreDescription(): string {
    return '단답형: 10점(정답) 또는 0점(오답)';
  }

  getIsCorrectDescription(): string {
    return '정답이면 true, 오답이면 false';
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
