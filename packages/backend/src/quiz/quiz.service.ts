import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Question as QuestionEntity } from './entity';
import { QUIZ_ERROR_MESSAGES, QUIZ_LOG_MESSAGES } from './quiz.constants';
import { GradeResult, Question, Submission } from './quiz.types';
import {
  GradingService,
  QuestionConverterService,
  QuestionRepositoryService,
  ScoreCalculatorService,
} from './services';

/**
 * QuizService - Facade
 * - 기존 public API 유지
 * - 내부 서비스에 위임
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly questionRepository: QuestionRepositoryService,
    private readonly questionConverter: QuestionConverterService,
    private readonly gradingService: GradingService,
    private readonly scoreCalculator: ScoreCalculatorService,
  ) {}

  /**
   * 싱글플레이 문제 생성
   * - 사용자가 선택한 대분류 카테고리의 하위 카테고리에서 균등하게 10문제 조회
   * - 카테고리별 균등 분배 (나머지는 앞 카테고리에 추가)
   * - 사용 빈도: usageCount 낮은 것 우선
   * @param parentCategoryIds 선택된 대분류 카테고리 ID 배열 (예: DB, 네트워크)
   * @param totalCount 총 문제 개수 (기본값: 10)
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없거나 변환 중 오류 발생 시
   */
  async generateSinglePlayQuestions(
    parentCategoryIds: number[],
    totalCount: number = 10,
  ): Promise<Question[]> {
    if (!parentCategoryIds || parentCategoryIds.length === 0) {
      throw new BadRequestException('카테고리를 선택해주세요.');
    }

    const allQuestions = await this.questionRepository.fetchQuestionsForParentCategories(
      parentCategoryIds,
      totalCount,
    );

    return this.validateAndConvertQuestions(allQuestions, totalCount);
  }

  /**
   * 문제 검증 및 타입 변환
   */
  private validateAndConvertQuestions(
    questions: QuestionEntity[],
    expectedCount: number,
  ): Question[] {
    if (questions.length < expectedCount) {
      this.logger.warn(
        `선택한 카테고리에 충분한 문제가 없습니다. (${questions.length}/${expectedCount})`,
      );
    }

    if (questions.length === 0) {
      throw new NotFoundException('선택한 카테고리에 문제가 없습니다.');
    }

    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    try {
      return shuffledQuestions.map((q) => this.questionConverter.convertToQuizType(q));
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
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없을 시
   */
  async getQuestionsForGame(): Promise<QuestionEntity[]> {
    return this.questionRepository.getQuestionsForGame();
  }

  /**
   * 문제 생성 (게임 타입으로 변환)
   * - 비즈니스 로직에 따라 균형있게 5개 질문을 조회
   * - 난이도 균형: easy 2개, medium 2개, hard 1개 (2:2:1)
   * - 타입 다양성: multiple 2개, short 2개, essay 1개
   * - 사용 빈도: usageCount 낮은 것 우선
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없거나 변환 중 오류 발생 시
   */
  async generateQuestion(): Promise<Question[]> {
    const questions = await this.questionRepository.getQuestionsForGame();

    try {
      return questions.map((q) => this.questionConverter.convertToQuizType(q));
    } catch (error) {
      this.logger.error(QUIZ_LOG_MESSAGES.CONVERSION_ERROR(error as Error));

      throw new InternalServerErrorException(QUIZ_ERROR_MESSAGES.CONVERSION_ERROR);
    }
  }

  /**
   * 문제 사용 횟수 증가
   * - 문제 출제 시 호출하여 usageCount 증가
   * @param questionId 문제 ID
   */
  async incrementUsageCount(questionId: number): Promise<void> {
    return this.questionRepository.incrementUsageCount(questionId);
  }

  /**
   * QuestionEntity를 quiz.types.ts의 Question 타입으로 변환
   * @throws {Error} JSON 파싱 실패 또는 유효하지 않은 데이터 형식
   */
  public convertToQuizType(entity: QuestionEntity): Question {
    return this.questionConverter.convertToQuizType(entity);
  }

  /**
   * 카테고리 추출 (상위, 하위 카테고리)
   * @returns [상위카테고리, 하위카테고리] 형태의 배열
   */
  public extractCategory(question: QuestionEntity): string[] {
    return this.questionConverter.extractCategory(question);
  }

  /**
   * 통합 채점 메서드 (객관식, 단답형, 서술형 모두 지원)
   * - DB 엔티티를 받아서 타입에 따라 적절한 채점 수행
   * - 객관식: 즉시 채점 (10점 또는 0점)
   * - 단답형: AI 채점 (10점 또는 0점)
   * - 서술형: AI 채점 (0~10점 부분 점수, 7점 이상 정답 처리)
   */
  async gradeQuestion(question: QuestionEntity, submissions: Submission[]): Promise<GradeResult[]> {
    return this.gradingService.gradeQuestion(question, submissions);
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
    return this.scoreCalculator.determineAnswerStatus(questionType, isCorrect, score);
  }

  /**
   * AI 점수를 난이도별 게임 점수로 변환
   * - AI 점수(0~10)를 난이도별 만점 기준으로 비율 계산
   * - Easy: 만점 10점, Medium: 만점 20점, Hard: 만점 30점
   * - 서술형 부분 점수(3~6점)도 비율 계산하여 게임 점수 부여
   * @param aiScore AI가 부여한 점수 (0~10, 이미 validateScore를 거친 값)
   * @param difficulty 문제 난이도 (1~5 또는 null)
   * @param isCorrect 정답 여부 (서술형 부분 점수의 경우 false이지만 aiScore > 0)
   * @returns 게임 점수
   */
  public calculateGameScore(
    aiScore: number,
    difficulty: number | null,
    isCorrect: boolean,
  ): number {
    return this.scoreCalculator.calculateGameScore(aiScore, difficulty, isCorrect);
  }
}
