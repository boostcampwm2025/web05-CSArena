import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category, Question as QuestionEntity } from '../entity';
import { QUIZ_CONSTANTS, QUIZ_ERROR_MESSAGES, QUIZ_LOG_MESSAGES } from '../quiz.constants';

/**
 * 문제 조회/저장 서비스
 * - DB에서 문제 조회 및 저장
 * - 균형있는 문제 선택 로직
 */
@Injectable()
export class QuestionRepositoryService {
  private readonly logger = new Logger(QuestionRepositoryService.name);

  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * 게임용 문제 조회 (멀티플레이, DB 엔티티 반환)
   * - 비즈니스 로직에 따라 균형있게 5개 질문을 조회
   * - 난이도 균형: easy 2개, medium 2개, hard 1개 (2:2:1)
   * - 타입 다양성: multiple 2개, short 2개, essay 1개
   * - 사용 빈도: usageCount 낮은 것 우선
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없을 시
   *
   * [성능 개선] 5개의 개별 쿼리 → 1개의 통합 쿼리로 최적화
   */
  async getQuestionsForGame(): Promise<QuestionEntity[]> {
    const allCandidates = await this.fetchAllGameQuestionCandidates();
    const questions = this.selectBalancedQuestions(allCandidates);

    if (questions.length < QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT) {
      this.logger.warn(
        `Insufficient questions with strict filters (${questions.length}/${QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT}). Applying fallback...`,
      );

      const needed = QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT - questions.length;
      const existingIds = new Set(questions.map((q) => q.id));

      const fallbackQuestions = allCandidates
        .filter((q) => !existingIds.has(q.id))
        .slice(0, needed);

      questions.push(...fallbackQuestions);
    }

    if (questions.length < QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT) {
      this.logger.error(
        QUIZ_LOG_MESSAGES.INSUFFICIENT_QUESTIONS(
          questions.length,
          QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT,
        ),
      );

      throw new InternalServerErrorException(
        QUIZ_ERROR_MESSAGES.INSUFFICIENT_QUESTIONS(
          questions.length,
          QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT,
        ),
      );
    }

    return questions;
  }

  /**
   * 대분류 카테고리별로 문제 조회 (싱글플레이용)
   */
  async fetchQuestionsForParentCategories(
    parentCategoryIds: number[],
    totalCount: number,
  ): Promise<QuestionEntity[]> {
    const allQuestions: QuestionEntity[] = [];
    const questionsPerParent = Math.floor(totalCount / parentCategoryIds.length);
    const remainder = totalCount % parentCategoryIds.length;

    for (let i = 0; i < parentCategoryIds.length; i++) {
      const questionCount = questionsPerParent + (i < remainder ? 1 : 0);
      const childIds = await this.getChildCategoryIds(parentCategoryIds[i]);

      if (childIds.length === 0) {
        this.logger.warn(`카테고리 ID ${parentCategoryIds[i]}에 하위 카테고리가 없습니다.`);
        continue;
      }

      const questions = await this.fetchQuestionsByChildCategories(childIds, questionCount);
      allQuestions.push(...questions);
    }

    return allQuestions;
  }

  /**
   * 문제 사용 횟수 증가
   */
  async incrementUsageCount(questionId: number): Promise<void> {
    await this.questionRepository.increment({ id: questionId }, 'usageCount', 1);
  }

  /**
   * 하위 카테고리 ID 조회
   */
  private async getChildCategoryIds(parentId: number): Promise<number[]> {
    const childCategories = await this.categoryRepository.find({
      where: { parentId },
      select: ['id'],
    });

    return childCategories.map((c) => c.id);
  }

  /**
   * 하위 카테고리들에서 문제 조회
   */
  private async fetchQuestionsByChildCategories(
    childIds: number[],
    limit: number,
  ): Promise<QuestionEntity[]> {
    const query = this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.categoryQuestions', 'cq')
      .leftJoinAndSelect('cq.category', 'c')
      .leftJoinAndSelect('c.parent', 'parent')
      .where('q.isActive = :isActive', { isActive: true })
      .andWhere('cq.categoryId IN (:...childIds)', { childIds });

    return await query.orderBy('q.usageCount', 'ASC').addOrderBy('RANDOM()').limit(limit).getMany();
  }

  /**
   * 게임 문제 후보를 단일 쿼리로 조회
   */
  private async fetchAllGameQuestionCandidates(): Promise<QuestionEntity[]> {
    return await this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.categoryQuestions', 'cq')
      .leftJoinAndSelect('cq.category', 'c')
      .leftJoinAndSelect('c.parent', 'parent')
      .where('q.isActive = :isActive', { isActive: true })
      .andWhere(
        `(
          (q.difficulty BETWEEN 1 AND 2 AND q.questionType IN ('multiple', 'short'))
          OR (q.difficulty = 3 AND q.questionType IN ('multiple', 'short'))
          OR (q.difficulty BETWEEN 4 AND 5 AND q.questionType = 'essay')
        )`,
      )
      .orderBy('q.usageCount', 'ASC')
      .addOrderBy('RANDOM()')
      .getMany();
  }

  /**
   * 메모리에서 균형있게 문제 선택
   * - Easy (1-2): multiple 1개, short 1개
   * - Medium (3): multiple 1개, short 1개
   * - Hard (4-5): essay 1개
   */
  private selectBalancedQuestions(candidates: QuestionEntity[]): QuestionEntity[] {
    const selected: QuestionEntity[] = [];
    const usedIds = new Set<number>();

    const criteria = [
      { minDiff: 1, maxDiff: 2, type: 'multiple', count: 1 },
      { minDiff: 1, maxDiff: 2, type: 'short', count: 1 },
      { minDiff: 3, maxDiff: 3, type: 'multiple', count: 1 },
      { minDiff: 3, maxDiff: 3, type: 'short', count: 1 },
      { minDiff: 4, maxDiff: 5, type: 'essay', count: 1 },
    ];

    for (const crit of criteria) {
      const matching = candidates.filter(
        (q) =>
          !usedIds.has(q.id) &&
          q.difficulty !== null &&
          q.difficulty >= crit.minDiff &&
          q.difficulty <= crit.maxDiff &&
          q.questionType === crit.type,
      );

      for (let i = 0; i < crit.count && i < matching.length; i++) {
        selected.push(matching[i]);
        usedIds.add(matching[i].id);
      }
    }

    return selected;
  }
}
