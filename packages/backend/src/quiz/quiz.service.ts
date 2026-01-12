import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClovaClientService } from './clova/clova-client.service';
import { Question as QuestionEntity } from './entity';
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
  ) {}

  /**
   * 문제 생성
   * - 비즈니스 로직에 따라 균형있게 5개 질문을 조회
   * - 난이도 균형: easy 2개, medium 2개, hard 1개 (2:2:1)
   * - 타입 다양성: multiple 2개, short 2개, essay 1개
   * - 사용 빈도: usageCount 낮은 것 우선
   * - 품질 우선: qualityScore 높은 것 우선
   * @throws {InternalServerErrorException} DB에 충분한 질문이 없거나 변환 중 오류 발생 시
   */
  async generateQuestion(): Promise<Question[]> {
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

    // 7. Entity -> quiz.types.ts 타입으로 변환
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
  private convertToQuizType(entity: QuestionEntity): Question {
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
        type: 'multiple_choice',
        question: contentData.question,
        difficulty: this.mapDifficulty(entity.difficulty),
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
      type: 'short_answer',
      question: questionText,
      difficulty: this.mapDifficulty(entity.difficulty),
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
      type: 'essay',
      question: questionText,
      difficulty: this.mapDifficulty(entity.difficulty),
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
   * 채점
   * - RoundResult 타입에 맞는 스키마를 전달합니다.
   */
  async gradeSubjectiveQuestion(
    question: ShortAnswerQuestion | EssayQuestion,
    submissions: Submission[],
  ): Promise<GradeResult[]> {
    const schema = this.getGradingSchema();

    // 문제 타입에 따른 정답 및 키워드 추출
    const referenceAnswer =
      question.type === 'short_answer' ? question.answer : question.sampleAnswer;
    const keywords = question.keywords ? question.keywords.join(', ') : '없음';

    const userMessage = `
    [채점 기준]
    1. 문제: "${question.question}"
    2. 모범 답안: "${referenceAnswer}"
    3. 필수 포함 키워드: [${keywords}]
    4. 규칙: 
       - 사용자의 답안이 모범 답안의 문맥과 일치하고, 필수 키워드를 유사하게라도 포함하면 정답(true) 처리해줘.
       - 오타는 의미가 훼손되지 않는 선에서 허용해줘.
    
    [플레이어 제출 답안]
    ${JSON.stringify(submissions)}
    
    위 데이터를 바탕으로 각 플레이어의 정답 여부를 판단해줘.
    `;

    // AI 호출 결과 타입 정의
    type AiGradeResponse = {
      grades: Omit<GradeResult, 'answer' | 'score'>[];
    };

    const result = await this.clovaClient.callClova<AiGradeResponse>({
      systemPrompt: QUIZ_PROMPTS.GRADER,
      userMessage: userMessage,
      jsonSchema: schema,
    });

    // 결과 매핑 (원본 답안 텍스트 복원 및 초기 점수 0점 세팅)
    return result.grades.map((grade) => {
      const originalSubmission = submissions.find((s) => s.playerId === grade.playerId);

      return {
        playerId: grade.playerId,
        answer: originalSubmission ? originalSubmission.answer : '',
        isCorrect: grade.isCorrect,
        score: 0, // 점수는 GameService에서 난이도(difficulty)에 따라 부여
        feedback: grade.feedback,
      };
    });
  }

  private getGradingSchema() {
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
                description: '핵심 키워드가 포함되어 있고 의미가 통하면 true, 아니면 false',
              },
              feedback: {
                type: 'string',
                description: '정답/오답에 대한 간략한 한 줄 피드백',
              },
            },
            required: ['playerId', 'isCorrect', 'feedback'],
          },
        },
      },
    };
  }
}
