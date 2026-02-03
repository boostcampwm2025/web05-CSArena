import { Injectable, Logger } from '@nestjs/common';

import { Question as QuestionEntity } from '../entity';
import { mapDifficulty, QUIZ_ERROR_MESSAGES, QUIZ_LOG_MESSAGES } from '../quiz.constants';
import { MultipleChoiceOptions, MultipleChoiceQuestion } from '../quiz.types';
import { QuestionTypeStrategy } from './question-type.strategy';

@Injectable()
export class MultipleChoiceStrategy implements QuestionTypeStrategy {
  private readonly logger = new Logger(MultipleChoiceStrategy.name);

  readonly type = 'multiple' as const;
  readonly gameType = 'multiple_choice' as const;

  convert(entity: QuestionEntity): MultipleChoiceQuestion {
    try {
      const contentData = this.parseContent(entity.content);

      if (!this.isValidMultipleChoiceContent(contentData)) {
        throw new Error(QUIZ_ERROR_MESSAGES.MULTIPLE_CHOICE_FORMAT_ERROR);
      }

      if (!this.isValidMultipleChoiceAnswer(entity.correctAnswer)) {
        throw new Error(QUIZ_ERROR_MESSAGES.MULTIPLE_CHOICE_FORMAT_ERROR);
      }

      return {
        id: entity.id,
        type: 'multiple_choice',
        question: contentData.question,
        difficulty: mapDifficulty(entity.difficulty),
        category: this.extractCategory(entity),
        options: contentData.options,
        answer: entity.correctAnswer,
      };
    } catch (error) {
      this.logger.error(
        QUIZ_LOG_MESSAGES.MULTIPLE_CHOICE_CONVERSION_FAILED(entity.id, (error as Error).message),
      );

      throw new Error(QUIZ_ERROR_MESSAGES.MULTIPLE_CHOICE_PARSE_ERROR(entity.id));
    }
  }

  getScoreDescription(): string {
    return '객관식: 10점(정답) 또는 0점(오답)';
  }

  getIsCorrectDescription(): string {
    return '정답이면 true, 오답이면 false';
  }

  extractAnswer(entity: QuestionEntity): string {
    return entity.correctAnswer;
  }

  private parseContent(content: string | object): unknown {
    if (typeof content === 'string') {
      return JSON.parse(content) as unknown;
    }

    return content;
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

  private isValidMultipleChoiceContent(
    content: unknown,
  ): content is { question: string; options: MultipleChoiceOptions } {
    if (typeof content !== 'object' || content === null) {
      return false;
    }

    const data = content as Record<string, unknown>;

    return (
      typeof data.question === 'string' &&
      typeof data.options === 'object' &&
      data.options !== null &&
      this.isValidMultipleChoiceOptions(data.options)
    );
  }

  private isValidMultipleChoiceOptions(options: unknown): options is MultipleChoiceOptions {
    if (typeof options !== 'object' || options === null) {
      return false;
    }

    const opts = options as Record<string, unknown>;

    return (
      typeof opts.A === 'string' &&
      typeof opts.B === 'string' &&
      typeof opts.C === 'string' &&
      typeof opts.D === 'string'
    );
  }

  private isValidMultipleChoiceAnswer(answer: string | null): answer is 'A' | 'B' | 'C' | 'D' {
    return answer === 'A' || answer === 'B' || answer === 'C' || answer === 'D';
  }
}
