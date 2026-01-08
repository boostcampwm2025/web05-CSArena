/**
 * Quiz 서비스 상수 정의
 */
export const QUIZ_CONSTANTS = {
  /** 게임 시작에 필요한 최소 질문 개수 */
  REQUIRED_QUESTION_COUNT: 5,
} as const;

/**
 * Quiz 서비스 에러 메시지
 */
export const QUIZ_ERROR_MESSAGES = {
  /** 활성화된 질문이 부족할 때 */
  INSUFFICIENT_QUESTIONS: (current: number, required: number) =>
    `질문 생성에 실패했습니다. (활성화된 질문: ${current}/${required})`,

  /** 질문 변환 중 오류 발생 */
  CONVERSION_ERROR: '질문 생성 중 오류가 발생했습니다.',

  /** 객관식 질문 JSON 파싱 실패 */
  MULTIPLE_CHOICE_PARSE_ERROR: (questionId: number) =>
    `질문 ID ${questionId} 변환 실패: JSON 파싱 오류`,

  /** 객관식 질문 데이터 형식 오류 */
  MULTIPLE_CHOICE_FORMAT_ERROR: '객관식 질문 데이터 형식 오류: options 또는 answer 누락',

  /** 단답형 질문 답안 누락 */
  SHORT_ANSWER_MISSING: (questionId: number) => `질문 ID ${questionId} 변환 실패: 답안 누락`,

  /** 서술형 질문 답안 누락 */
  ESSAY_ANSWER_MISSING: (questionId: number) => `질문 ID ${questionId} 변환 실패: 답안 누락`,
} as const;

/**
 * Quiz 서비스 로그 메시지
 */
export const QUIZ_LOG_MESSAGES = {
  /** 질문 생성 실패 (개수 부족) */
  INSUFFICIENT_QUESTIONS: (current: number, required: number) =>
    `질문 생성 실패: DB에 활성화된 질문이 ${current}개만 존재 (필요: ${required}개)`,

  /** 질문 변환 중 오류 */
  CONVERSION_ERROR: (error: Error) => `질문 변환 중 오류 발생: ${error.message}`,

  /** 객관식 질문 변환 실패 */
  MULTIPLE_CHOICE_CONVERSION_FAILED: (questionId: number, message: string) =>
    `객관식 질문 변환 실패 (ID: ${questionId}): ${message}`,

  /** 단답형 질문 답안 누락 */
  SHORT_ANSWER_MISSING: (questionId: number) => `단답형 질문에 답안 누락 (ID: ${questionId})`,

  /** 서술형 질문 답안 누락 */
  ESSAY_ANSWER_MISSING: (questionId: number) => `서술형 질문에 답안 누락 (ID: ${questionId})`,
} as const;
