import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProblemBank } from './entity/user-problem-bank.entity';
import { DifficultyFilter, GetProblemBankQueryDto } from './dto/get-problem-bank-query.dto';
import {
  ProblemBankItemDto,
  ProblemBankResponseDto,
  ProblemBankStatisticsDto,
} from './dto/problem-bank-response.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

@Injectable()
export class ProblemBankService {
  constructor(
    @InjectRepository(UserProblemBank)
    private readonly problemBankRepository: Repository<UserProblemBank>,
  ) {}

  async getProblemBank(
    userId: number,
    query: GetProblemBankQueryDto,
  ): Promise<ProblemBankResponseDto> {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    // 필터 적용된 쿼리 빌드
    const queryBuilder = this.problemBankRepository
      .createQueryBuilder('pb')
      .leftJoinAndSelect('pb.question', 'q')
      .leftJoinAndSelect('q.categoryQuestions', 'cq')
      .leftJoinAndSelect('cq.category', 'c')
      .leftJoinAndSelect('c.parent', 'parent')
      .leftJoinAndSelect('pb.match', 'm')
      .where('pb.userId = :userId', { userId });

    // 필터 적용
    if (query.categoryIds && query.categoryIds.length > 0) {
      queryBuilder.andWhere('c.id IN (:...categoryIds)', { categoryIds: query.categoryIds });
    }

    if (query.difficulty) {
      const difficultyRange = this.getDifficultyRange(query.difficulty);
      queryBuilder.andWhere('q.difficulty BETWEEN :min AND :max', difficultyRange);
    }

    if (query.result) {
      queryBuilder.andWhere('pb.answerStatus = :status', { status: query.result });
    }

    if (query.isBookmarked !== undefined) {
      queryBuilder.andWhere('pb.isBookmarked = :isBookmarked', {
        isBookmarked: query.isBookmarked,
      });
    }

    if (query.search) {
      // 문제 내용 검색 (string, jsonb 모두 처리)
      queryBuilder.andWhere(`(CAST(q.content AS TEXT) ILIKE :search)`, {
        search: `%${query.search}%`,
      });
    }

    // 페이지네이션용 전체 개수 조회
    const totalCount = await queryBuilder.getCount();
    const totalPages = Math.ceil(totalCount / limit);

    // 페이지네이션 결과 조회
    const items = await queryBuilder
      .orderBy('pb.id', 'DESC') // 최신순
      .skip(offset)
      .take(limit)
      .getMany();

    // 통계 계산
    const statistics = await this.getStatistics(userId);

    // DTO로 변환
    const itemDtos = items.map((item) => this.transformToDto(item));

    return {
      items: itemDtos,
      statistics,
      totalPages,
      currentPage: page,
    };
  }

  async getStatistics(userId: number): Promise<ProblemBankStatisticsDto> {
    const allProblems = await this.problemBankRepository.find({
      where: { userId },
      select: ['answerStatus'],
    });

    const totalSolved = allProblems.length;
    const correctCount = allProblems.filter((p) => p.answerStatus === 'correct').length;
    const incorrectCount = allProblems.filter((p) => p.answerStatus === 'incorrect').length;
    const partialCount = allProblems.filter((p) => p.answerStatus === 'partial').length;
    const correctRate = totalSolved > 0 ? (correctCount / totalSolved) * 100 : 0;

    return {
      totalSolved,
      correctCount,
      incorrectCount,
      partialCount,
      correctRate: Math.round(correctRate * 10) / 10, // 소수점 1자리 반올림
    };
  }

  async updateBookmark(
    userId: number,
    problemBankId: number,
    dto: UpdateBookmarkDto,
  ): Promise<void> {
    const problemBank = await this.problemBankRepository.findOne({
      where: { id: problemBankId, userId },
    });

    if (!problemBank) {
      throw new NotFoundException('Problem bank entry not found');
    }

    problemBank.isBookmarked = dto.isBookmarked;
    await this.problemBankRepository.save(problemBank);
  }

  private getDifficultyRange(difficulty: DifficultyFilter): { min: number; max: number } {
    switch (difficulty) {
      case DifficultyFilter.EASY:
        return { min: 1, max: 2 };
      case DifficultyFilter.MEDIUM:
        return { min: 3, max: 3 };
      case DifficultyFilter.HARD:
        return { min: 4, max: 5 };
    }
  }

  private mapDifficulty(numDifficulty: number | null): 'easy' | 'medium' | 'hard' {
    if (!numDifficulty) {
      return 'medium';
    }

    if (numDifficulty <= 2) {
      return 'easy';
    }

    if (numDifficulty === 3) {
      return 'medium';
    }

    return 'hard';
  }

  private extractQuestionText(content: string | object): string {
    if (typeof content === 'string') {
      return content;
    }

    // 객관식 형식 처리
    if (content && typeof content === 'object' && 'question' in content) {
      return (content as { question: string }).question;
    }

    return JSON.stringify(content);
  }

  private extractCategories(item: UserProblemBank): string[] {
    if (!item.question?.categoryQuestions || item.question.categoryQuestions.length === 0) {
      return ['미분류'];
    }

    const category = item.question.categoryQuestions[0].category;

    if (!category) {
      return ['미분류'];
    }

    const parentName = category.parent?.name || category.name;
    const childName = category.name;

    return parentName === childName ? [parentName] : [parentName, childName];
  }

  private transformToDto(item: UserProblemBank): ProblemBankItemDto {
    return {
      id: item.id,
      questionId: item.questionId,
      questionContent: this.extractQuestionText(item.question.content),
      categories: this.extractCategories(item),
      difficulty: this.mapDifficulty(item.question.difficulty),
      answerStatus: item.answerStatus || 'incorrect', // null 대체값
      isBookmarked: item.isBookmarked ?? false, // null을 false로 처리
      userAnswer: item.userAnswer || '',
      correctAnswer: item.question.correctAnswer,
      aiFeedback: item.aiFeedback || '',
      solvedAt: new Date().toISOString(), // Match 엔티티에 timestamp 없음
    };
  }
}
