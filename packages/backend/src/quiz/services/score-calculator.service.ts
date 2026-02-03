import { Injectable } from '@nestjs/common';

import { mapDifficulty, SCORE_MAP } from '../quiz.constants';

/**
 * 점수 계산 서비스
 * - 게임 점수 계산
 * - 정답 상태 결정
 */
@Injectable()
export class ScoreCalculatorService {
  /**
   * 점수와 정답 여부를 기반으로 최종 상태(AnswerStatus)를 결정
   * - 객관식/단답형: 정답(correct) 또는 오답(incorrect)
   * - 서술형: 7점 이상(correct), 3~6점(partial), 2점 이하(incorrect)
   */
  determineAnswerStatus(
    questionType: string | undefined,
    isCorrect: boolean,
    score: number,
  ): 'correct' | 'incorrect' | 'partial' {
    if (questionType === 'multiple' || questionType === 'short') {
      return isCorrect ? 'correct' : 'incorrect';
    }

    if (score >= 7) {
      return 'correct';
    }

    if (score >= 3) {
      return 'partial';
    }

    return 'incorrect';
  }

  /**
   * AI 점수를 난이도별 게임 점수로 변환
   * - AI 점수(0~10)를 난이도별 만점 기준으로 비율 계산
   * - Easy: 만점 10점, Medium: 만점 20점, Hard: 만점 30점
   * - 서술형 부분 점수(3~6점)도 비율 계산하여 게임 점수 부여
   * @param aiScore AI가 부여한 점수 (0~10, 이미 validateScore를 거친 값)
   * @param difficulty 문제 난이도 (1~5 또는 null)
   * @param _isCorrect 정답 여부 (서술형 부분 점수의 경우 false이지만 aiScore > 0)
   * @returns 게임 점수
   */
  calculateGameScore(aiScore: number, difficulty: number | null, _isCorrect: boolean): number {
    // aiScore가 0이면 게임 점수도 0 (오답 또는 서술형 낙제)
    if (aiScore === 0) {
      return 0;
    }

    // aiScore > 0이면 정답 또는 서술형 부분 점수이므로 게임 점수 계산
    const difficultyLevel = mapDifficulty(difficulty);
    const maxScore = SCORE_MAP[difficultyLevel];

    return Math.round((aiScore / 10) * maxScore);
  }
}
