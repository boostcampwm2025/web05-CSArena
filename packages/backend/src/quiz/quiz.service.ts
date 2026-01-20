import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClovaClientService } from './clova/clova-client.service';
import { Category, Question as QuestionEntity } from './entity';
import { QUIZ_CONSTANTS, QUIZ_ERROR_MESSAGES, QUIZ_LOG_MESSAGES } from './quiz.constants';
import { QUIZ_PROMPTS } from './quiz-prompts';
import {
  Difficulty,
  EssayQuestion,
  GradeResult,
  MultipleChoiceOptions,
  MultipleChoiceQuestion,
  Question,
  ShortAnswerQuestion,
  Submission,
} from './quiz.types';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly clovaClient: ClovaClientService,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * 싱글플레이 문제 생성
   * - 사용자가 선택한 대분류 카테고리의 하위 카테고리에서 균등하게 10문제 조회
   * - 카테고리별 균등 분배 (나머지는 앞 카테고리에 추가)
   * - 사용 빈도: usageCount 낮은 것 우선
   * - 품질 우선: qualityScore 높은 것 우선
   * @param parentCategoryIds 선택된 대분류 카테고리 ID 배열 (예: DB, 네트워크)
   * @param totalCount 총 문제 개수 (기본값: 10)
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없거나 변환 중 오류 발생 시
   */
  async generateSinglePlayQuestions(
    parentCategoryIds: number[],
    totalCount: number = 10,
  ): Promise<Question[]> {
    if (!parentCategoryIds || parentCategoryIds.length === 0) {
      throw new InternalServerErrorException('카테고리를 선택해주세요.');
    }

    // 1. 각 대분류 카테고리의 하위 카테고리 ID 조회
    const allChildCategoryIds: number[] = [];

    for (const parentId of parentCategoryIds) {
      const childCategories = await this.categoryRepository.find({
        where: { parentId },
        select: ['id'],
      });
      allChildCategoryIds.push(...childCategories.map((c) => c.id));
    }

    if (allChildCategoryIds.length === 0) {
      throw new InternalServerErrorException('선택한 카테고리에 하위 카테고리가 없습니다.');
    }

    this.logger.log(
      `하위 카테고리 ID: ${allChildCategoryIds.join(', ')} (총 ${allChildCategoryIds.length}개)`,
    );

    // 2. 대분류별 균등 분배
    const questionsPerParent = Math.floor(totalCount / parentCategoryIds.length);
    const remainder = totalCount % parentCategoryIds.length;

    const allQuestions: QuestionEntity[] = [];

    // 3. 각 대분류별로 문제 조회
    for (let i = 0; i < parentCategoryIds.length; i++) {
      const questionCount = questionsPerParent + (i < remainder ? 1 : 0);

      // 해당 대분류의 하위 카테고리 ID만 추출
      const childCategories = await this.categoryRepository.find({
        where: { parentId: parentCategoryIds[i] },
        select: ['id'],
      });
      const childIds = childCategories.map((c) => c.id);

      if (childIds.length === 0) {
        this.logger.warn(`카테고리 ID ${parentCategoryIds[i]}에 하위 카테고리가 없습니다.`);
        continue;
      }

      // 하위 카테고리들에서 문제 조회
      const questions = await this.questionRepository
        .createQueryBuilder('q')
        .innerJoin('q.categoryQuestions', 'cq')
        .where('q.isActive = :isActive', { isActive: true })
        .andWhere('cq.categoryId IN (:...childIds)', { childIds })
        .orderBy('q.usageCount', 'ASC')
        .addOrderBy('q.qualityScore', 'DESC')
        .addOrderBy('RANDOM()')
        .limit(questionCount)
        .getMany();

      allQuestions.push(...questions);
    }

    // 4. 문제 개수 검증
    if (allQuestions.length < totalCount) {
      this.logger.warn(
        `선택한 카테고리에 충분한 문제가 없습니다. (${allQuestions.length}/${totalCount})`,
      );
    }

    if (allQuestions.length === 0) {
      throw new InternalServerErrorException('선택한 카테고리에 문제가 없습니다.');
    }

    // 5. 문제 섞기 (카테고리 순서대로 나오지 않도록)
    const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);

    // 6. Entity -> quiz.types.ts 타입으로 변환
    try {
      return shuffledQuestions.map((q) => this.convertToQuizType(q));
    } catch (error) {
      this.logger.error(QUIZ_LOG_MESSAGES.CONVERSION_ERROR(error as Error));

      throw new InternalServerErrorException(QUIZ_ERROR_MESSAGES.CONVERSION_ERROR);
    }
  }

  /**
   * 게임용 문제 조회 (멀티플레이, DB 엔티티 반환)
   * - 비즈니스 로직에 따라 균형있게 5개 질문을 조회
   * - 난이도 균형: easy 2개, medium 2개, hard 1개 (2:2:1)
   * - 타입 다양성: multiple 2개, short 2개, essay 1개
   * - 사용 빈도: usageCount 낮은 것 우선
   * - 품질 우선: qualityScore 높은 것 우선
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없을 시
   */
  async getQuestionsForGame(): Promise<QuestionEntity[]> {
    const questions: QuestionEntity[] = [];

    // 1. Easy 난이도 (1-2) 2개: multiple 1개, short 1개
    const easyMultiple = await this.getQuestionsByFilters(1, 2, 'multiple', 1);
    const easyShort = await this.getQuestionsByFilters(1, 2, 'short', 1);

    // 2. Medium 난이도 (3) 2개: multiple 1개, short 1개
    const mediumMultiple = await this.getQuestionsByFilters(3, 3, 'multiple', 1);
    const mediumShort = await this.getQuestionsByFilters(3, 3, 'short', 1);

    // 3. Hard 난이도 (4-5) 1개: essay
    const hardEssay = await this.getQuestionsByFilters(4, 5, 'essay', 1);

    // 4. 수집된 질문 통합
    questions.push(...easyMultiple, ...easyShort, ...mediumMultiple, ...mediumShort, ...hardEssay);

    // 5. 부족한 경우 Fallback: 조건 완화하여 추가 조회
    if (questions.length < QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT) {
      this.logger.warn(
        `Insufficient questions with strict filters (${questions.length}/${QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT}). Applying fallback...`,
      );

      const needed = QUIZ_CONSTANTS.REQUIRED_QUESTION_COUNT - questions.length;
      const existingIds = questions.map((q) => q.id);

      const fallbackQuestions = await this.questionRepository
        .createQueryBuilder('q')
        .where('q.isActive = :isActive', { isActive: true })
        .andWhere('q.id NOT IN (:...ids)', { ids: existingIds.length > 0 ? existingIds : [0] })
        .orderBy('q.usageCount', 'ASC')
        .addOrderBy('q.qualityScore', 'DESC')
        .addOrderBy('RANDOM()')
        .limit(needed)
        .getMany();

      questions.push(...fallbackQuestions);
    }

    // 6. 질문 개수 최종 검증
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
   * 문제 생성 (게임 타입으로 변환)
   * - 비즈니스 로직에 따라 균형있게 5개 질문을 조회
   * - 난이도 균형: easy 2개, medium 2개, hard 1개 (2:2:1)
   * - 타입 다양성: multiple 2개, short 2개, essay 1개
   * - 사용 빈도: usageCount 낮은 것 우선
   * - 품질 우선: qualityScore 높은 것 우선
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없거나 변환 중 오류 발생 시
   */
  async generateQuestion(): Promise<Question[]> {
    const questions = await this.getQuestionsForGame();

    // Entity -> quiz.types.ts 타입으로 변환
    try {
      return questions.map((q) => this.convertToQuizType(q));
    } catch (error) {
      this.logger.error(QUIZ_LOG_MESSAGES.CONVERSION_ERROR(error as Error));

      throw new InternalServerErrorException(QUIZ_ERROR_MESSAGES.CONVERSION_ERROR);
    }
  }

  /**
   * 난이도, 타입 필터로 질문 조회
   * - usageCount가 낮은 것 우선 (중복 노출 방지)
   * - qualityScore가 높은 것 우선 (품질 우선)
   * - 카테고리 분산은 RANDOM()으로 자연스럽게 처리
   */
  private async getQuestionsByFilters(
    minDifficulty: number,
    maxDifficulty: number,
    type: string,
    count: number,
  ): Promise<QuestionEntity[]> {
    return await this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.categoryQuestions', 'cq')
      .leftJoinAndSelect('cq.category', 'c')
      .leftJoinAndSelect('c.parent', 'parent')
      .where('q.isActive = :isActive', { isActive: true })
      .andWhere('q.difficulty BETWEEN :min AND :max', { min: minDifficulty, max: maxDifficulty })
      .andWhere('q.questionType = :type', { type })
      .orderBy('q.usageCount', 'ASC') // 사용 빈도 낮은 것 우선
      .addOrderBy('q.qualityScore', 'DESC') // 품질 높은 것 우선
      .addOrderBy('RANDOM()') // 동일 조건 내에서 랜덤
      .limit(count)
      .getMany();
  }

  /**
   * QuestionEntity를 quiz.types.ts의 Question 타입으로 변환
   * @throws {Error} JSON 파싱 실패 또는 유효하지 않은 데이터 형식
   */
  public convertToQuizType(entity: QuestionEntity): Question {
    switch (entity.questionType) {
      case 'multiple':
        return this.convertToMultipleChoice(entity);
      case 'short':
        return this.convertToShortAnswer(entity);
      case 'essay':
        return this.convertToEssay(entity);
      default:
        throw new Error(`Unknown question type: ${entity.questionType as string}`);
    }
  }

  /**
   * 객관식 질문 변환
   */
  private convertToMultipleChoice(entity: QuestionEntity): MultipleChoiceQuestion {
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
        difficulty: this.mapDifficulty(entity.difficulty),
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

  /**
   * 단답형 질문 변환
   */
  private convertToShortAnswer(entity: QuestionEntity): ShortAnswerQuestion {
    if (!entity.correctAnswer) {
      this.logger.error(QUIZ_LOG_MESSAGES.SHORT_ANSWER_MISSING(entity.id));

      throw new Error(QUIZ_ERROR_MESSAGES.SHORT_ANSWER_MISSING(entity.id));
    }

    const questionText = this.extractQuestionText(entity.content);

    return {
      id: entity.id,
      type: 'short_answer',
      question: questionText,
      difficulty: this.mapDifficulty(entity.difficulty),
      category: this.extractCategory(entity),
      answer: entity.correctAnswer,
    };
  }

  /**
   * 서술형 질문 변환
   */
  private convertToEssay(entity: QuestionEntity): EssayQuestion {
    if (!entity.correctAnswer) {
      this.logger.error(QUIZ_LOG_MESSAGES.ESSAY_ANSWER_MISSING(entity.id));

      throw new Error(QUIZ_ERROR_MESSAGES.ESSAY_ANSWER_MISSING(entity.id));
    }

    const questionText = this.extractQuestionText(entity.content);

    return {
      id: entity.id,
      type: 'essay',
      question: questionText,
      difficulty: this.mapDifficulty(entity.difficulty),
      category: this.extractCategory(entity),
      sampleAnswer: entity.correctAnswer,
    };
  }

  /**
   * content를 파싱하여 객체로 변환
   */
  private parseContent(content: string | object): unknown {
    if (typeof content === 'string') {
      return JSON.parse(content) as unknown;
    }

    return content;
  }

  /**
   * content에서 질문 텍스트 추출
   */
  private extractQuestionText(content: string | object): string {
    if (typeof content === 'string') {
      return content;
    }

    return JSON.stringify(content);
  }

  /**
   * 객관식 질문 content 타입 가드
   */
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

  /**
   * 객관식 options 타입 가드
   */
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

  /**
   * 객관식 정답 타입 가드
   */
  private isValidMultipleChoiceAnswer(answer: string | null): answer is 'A' | 'B' | 'C' | 'D' {
    return answer === 'A' || answer === 'B' || answer === 'C' || answer === 'D';
  }

  /**
   * 숫자 난이도를 문자열 난이도로 매핑
   * 1-2: easy, 3: medium, 4-5: hard
   */
  private mapDifficulty(numDifficulty: number | null): Difficulty {
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

  /**
   * 카테고리 추출 (상위, 하위 카테고리)
   * @returns [상위카테고리, 하위카테고리] 형태의 배열
   */
  public extractCategory(question: QuestionEntity): string[] {
    if (!question.categoryQuestions || question.categoryQuestions.length === 0) {
      return ['미분류', '미분류'];
    }

    const category = question.categoryQuestions[0].category;
    const parentName = category.parent?.name || '미분류';
    const childName = category.name;

    return [parentName, childName];
  }

  /**
   * 통합 채점 메서드 (객관식, 단답형, 서술형 모두 지원)
   * - DB 엔티티를 받아서 타입에 따라 적절한 채점 수행
   * - 객관식: 즉시 채점 (10점 또는 0점)
   * - 단답형: AI 채점 (10점 또는 0점)
   * - 서술형: AI 채점 (0~10점 부분 점수, 7점 이상 정답 처리)
   */
  async gradeQuestion(question: QuestionEntity, submissions: Submission[]): Promise<GradeResult[]> {
    // 객관식은 즉시 채점
    if (question.questionType === 'multiple') {
      return this.gradeMultipleChoice(question, submissions);
    }

    // 단답형/서술형은 AI 채점
    const gameTypeQuestion = this.convertEntityToGameType(question);

    return this.gradeSubjectiveQuestion(gameTypeQuestion, submissions);
  }

  /**
   * 객관식 채점 (내부 메서드)
   */
  private gradeMultipleChoice(question: QuestionEntity, submissions: Submission[]): GradeResult[] {
    return submissions.map((sub) => {
      const sanitizedAnswer = sub.answer.trim().toUpperCase();
      const isCorrect = sanitizedAnswer === question.correctAnswer;

      return {
        playerId: sub.playerId,
        answer: sub.answer,
        isCorrect,
        score: isCorrect ? 10 : 0, // 객관식은 맞으면 10점 (만점), 틀리면 0점
        feedback: isCorrect ? 'Correct!' : `Wrong. The answer was ${question.correctAnswer}.`,
      };
    });
  }

  /**
   * DB 엔티티를 게임 타입으로 변환 (채점용)
   */
  private convertEntityToGameType(entity: QuestionEntity): ShortAnswerQuestion | EssayQuestion {
    const difficulty = this.mapDifficulty(entity.difficulty);
    const questionText =
      typeof entity.content === 'string' ? entity.content : JSON.stringify(entity.content);

    if (entity.questionType === 'short') {
      return {
        id: entity.id,
        type: 'short_answer',
        question: questionText,
        difficulty,
        answer: entity.correctAnswer,
      };
    } else if (entity.questionType === 'essay') {
      return {
        id: entity.id,
        type: 'essay',
        question: questionText,
        difficulty,
        sampleAnswer: entity.correctAnswer,
      };
    }

    throw new Error(`Cannot convert question type for grading: ${entity.questionType as string}`);
  }

  /**
   * 단답형/서술형 채점 (AI 채점)
   * - 단답형: 10점 또는 0점
   * - 서술형: 0~10점 부분 점수, 7점 이상이면 정답 처리
   */
  private async gradeSubjectiveQuestion(
    question: ShortAnswerQuestion | EssayQuestion,
    submissions: Submission[],
  ): Promise<GradeResult[]> {
    const schema = this.getGradingSchema(question.type);
    const answer = question.type === 'short_answer' ? question.answer : question.sampleAnswer;

    const userMessage = `
  [문제 타입] ${question.type}
  [문제] ${question.question}
  [정답] ${answer}
  [제출 답안 목록] ${JSON.stringify(submissions)}

  위 데이터를 바탕으로 채점해줘.
  `;

    type AiGradeResponse = {
      grades: Omit<GradeResult, 'answer'>[];
    };

    const result = await this.clovaClient.callClova<AiGradeResponse>({
      systemPrompt: QUIZ_PROMPTS.GRADER,
      userMessage: userMessage,
      jsonSchema: schema,
    });

    return this.mapGradeResults(result.grades, submissions);
  }

  private mapGradeResults(
    grades: Omit<GradeResult, 'answer'>[],
    submissions: Submission[],
  ): GradeResult[] {
    return submissions.map((submission) => {
      const grade = grades.find((g) => g.playerId === submission.playerId);

      if (!grade) {
        return this.createDefaultGradeResult(submission);
      }

      return {
        playerId: grade.playerId,
        answer: submission.answer,
        isCorrect: grade.isCorrect,
        score: this.validateScore(grade.score, grade.isCorrect),
        feedback: grade.feedback,
      };
    });
  }

  private validateScore(score: number, isCorrect: boolean): number {
    const MIN_SCORE = 0;
    const MAX_SCORE = 10;

    // 타입 검증
    if (typeof score !== 'number' || isNaN(score)) {
      this.logger.warn(`잘못된 점수 타입: ${score}`);

      return isCorrect ? MAX_SCORE : MIN_SCORE;
    }

    // 범위 검증
    if (score < MIN_SCORE || score > MAX_SCORE) {
      this.logger.warn(`점수 범위 초과: ${score}`);

      return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
    }

    // 정답/오답 일관성 검증
    if (!isCorrect && score > 0) {
      this.logger.warn(`오답인데 점수 있음: ${score}`);

      return MIN_SCORE;
    }

    return score;
  }

  private createDefaultGradeResult(submission: Submission): GradeResult {
    return {
      playerId: submission.playerId,
      answer: submission.answer,
      isCorrect: false,
      score: 0,
      feedback: '채점 오류가 발생했습니다.',
    };
  }

  private getGradingSchema(questionType: 'short_answer' | 'essay') {
    const scoreDescription = this.getScoreDescription(questionType);
    const isCorrectDescription = this.getIsCorrectDescription(questionType);

    return {
      type: 'object',
      properties: {
        grades: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              playerId: { type: 'string' },
              isCorrect: {
                type: 'boolean',
                description: isCorrectDescription,
              },
              score: {
                type: 'number',
                description: scoreDescription,
              },
              feedback: {
                type: 'string',
                description: '플레이어별 맞춤 피드백 (정답 칭찬 또는 오답 원인 설명)',
              },
            },
            required: ['playerId', 'isCorrect', 'score', 'feedback'],
          },
        },
      },
      required: ['grades'],
    };
  }

  private getScoreDescription(questionType: 'short_answer' | 'essay'): string {
    switch (questionType) {
      case 'essay':
        return '서술형 문제: 0~10점 사이의 부분 점수';
      case 'short_answer':
        return '단답형: 10점(정답) 또는 0점(오답)';
    }
  }

  private getIsCorrectDescription(questionType: 'short_answer' | 'essay'): string {
    switch (questionType) {
      case 'essay':
        return '7점 이상이면 true, 7점 미만이면 false';
      case 'short_answer':
        return '정답이면 true, 오답이면 false';
    }
  }

  /**
   * 점수와 정답 여부를 기반으로 최종 상태(AnswerStatus)를 결정
   * - 객관식/단답형: 정답(correct) 또는 오답(incorrect)
   * - 서술형: 7점 이상(correct), 3~6점(partial), 2점 이하(incorrect)
   */
  public determineAnswerStatus(
    questionType: string | undefined,
    isCorrect: boolean,
    score: number,
  ): 'correct' | 'incorrect' | 'partial' {
    if (questionType === 'multiple' || questionType === 'short') {
      return isCorrect ? 'correct' : 'incorrect';
    }

    if (score >= 7) return 'correct';
    if (score >= 3) return 'partial';
    return 'incorrect';
  }
}
