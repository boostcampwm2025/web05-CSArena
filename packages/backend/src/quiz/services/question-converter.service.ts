import { Inject, Injectable, Logger } from '@nestjs/common';

import { Question as QuestionEntity } from '../entity';
import { Question } from '../quiz.types';
import { QUESTION_TYPE_STRATEGIES, QuestionTypeStrategy } from '../strategies';

/**
 * 문제 타입 변환 서비스
 * - DB 엔티티 → 게임 타입 변환
 * - Strategy 패턴 사용
 */
@Injectable()
export class QuestionConverterService {
  private readonly logger = new Logger(QuestionConverterService.name);
  private readonly strategyMap: Map<string, QuestionTypeStrategy>;

  constructor(
    @Inject(QUESTION_TYPE_STRATEGIES)
    strategies: QuestionTypeStrategy[],
  ) {
    this.strategyMap = new Map(strategies.map((s) => [s.type, s]));
  }

  /**
   * QuestionEntity를 quiz.types.ts의 Question 타입으로 변환
   * @throws {Error} 유효하지 않은 questionType인 경우
   */
  convertToQuizType(entity: QuestionEntity): Question {
    const strategy = this.strategyMap.get(entity.questionType as string);

    if (!strategy) {
      throw new Error(`Unknown question type: ${entity.questionType as string}`);
    }

    return strategy.convert(entity);
  }

  /**
   * 카테고리 추출 (상위, 하위 카테고리)
   * @returns [상위카테고리, 하위카테고리] 형태의 배열
   */
  extractCategory(question: QuestionEntity): string[] {
    if (!question.categoryQuestions || question.categoryQuestions.length === 0) {
      return ['미분류', '미분류'];
    }

    const category = question.categoryQuestions[0].category;
    const parentName = category.parent?.name || '미분류';
    const childName = category.name;

    return [parentName, childName];
  }

  /**
   * 특정 타입의 Strategy 반환
   */
  getStrategy(type: string): QuestionTypeStrategy | undefined {
    return this.strategyMap.get(type);
  }
}
