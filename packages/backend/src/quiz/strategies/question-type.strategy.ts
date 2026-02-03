import { Question as QuestionEntity } from '../entity';
import { Question } from '../quiz.types';

/**
 * 문제 타입별 변환 및 채점 전략 인터페이스
 * - OCP: 새 문제 유형 추가 시 Strategy만 추가 (기존 코드 수정 불필요)
 */
export interface QuestionTypeStrategy {
  /** DB에 저장된 문제 타입 */
  readonly type: 'multiple' | 'short' | 'essay';

  /** 게임에서 사용하는 문제 타입 */
  readonly gameType: 'multiple_choice' | 'short_answer' | 'essay';

  /**
   * DB 엔티티를 게임 타입으로 변환
   */
  convert(entity: QuestionEntity): Question;

  /**
   * 채점 스키마의 score 필드 설명 반환
   */
  getScoreDescription(): string;

  /**
   * 채점 스키마의 isCorrect 필드 설명 반환
   */
  getIsCorrectDescription(): string;

  /**
   * 엔티티에서 정답 추출
   */
  extractAnswer(entity: QuestionEntity): string;
}

/**
 * Strategy 팩토리를 위한 토큰
 */
export const QUESTION_TYPE_STRATEGIES = 'QUESTION_TYPE_STRATEGIES';
