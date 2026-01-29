export const ROUND_DURATIONS = {
  READY: 3, // 준비 카운트다운 (초)
  QUESTION: {
    multiple: { easy: 15, medium: 20, hard: 30 }, // 객관식
    short: { easy: 20, medium: 30, hard: 45 }, // 단답형
    essay: { easy: 45, medium: 60, hard: 90 }, // 서술형
  },
  REVIEW: {
    multiple: 5, // 객관식
    short: 7, // 단답형
    essay: 10, // 서술형
  },
  TICK_INTERVAL: 1, // 시간 동기화 틱 간격 (초)
} as const;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple' | 'short' | 'essay';
