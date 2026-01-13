import { Injectable } from '@nestjs/common';

interface TimerSet {
  readyTimer?: NodeJS.Timeout;
  questionTimer?: NodeJS.Timeout;
  tickInterval?: NodeJS.Timeout;
  reviewTimer?: NodeJS.Timeout;
}

@Injectable()
export class RoundTimer {
  private readonly timers = new Map<string, TimerSet>();

  /**
   * 준비 카운트다운 타이머 시작
   */
  startReadyCountdown(roomId: string, duration: number, callback: () => void): void {
    this.startTimer(roomId, 'readyTimer', duration, callback);
  }

  /**
   * 문제 풀이 타이머 시작
   */
  startQuestionTimer(roomId: string, duration: number, onTimeout: () => void): void {
    this.startTimer(roomId, 'questionTimer', duration, onTimeout);
  }

  /**
   * 시간 동기화 틱 인터벌 시작
   */
  startTickInterval(
    roomId: string,
    totalDuration: number,
    onTick: (remainedSec: number) => void,
  ): void {
    this.clearTickInterval(roomId);

    let remainedSec = totalDuration;

    // 즉시 첫 틱 전송
    onTick(remainedSec);

    const interval = setInterval(() => {
      remainedSec--;
      onTick(remainedSec);

      if (remainedSec <= 0) {
        this.clearTickInterval(roomId);
      }
    }, 1000);

    this.getOrCreateTimerSet(roomId).tickInterval = interval;
  }

  /**
   * 결과 확인 타이머 시작
   */
  startReviewTimer(roomId: string, duration: number, callback: () => void): void {
    this.startTimer(roomId, 'reviewTimer', duration, callback);
  }

  /**
   * 공통 타이머 시작 로직
   */
  private startTimer(
    roomId: string,
    timerKey: 'readyTimer' | 'questionTimer' | 'reviewTimer',
    duration: number,
    callback: () => void,
  ): void {
    this.clearTimer(roomId, timerKey);

    const timer = setTimeout(() => {
      callback();
      this.clearTimer(roomId, timerKey);
    }, duration * 1000);

    this.getOrCreateTimerSet(roomId)[timerKey] = timer;
  }

  /**
   * 문제 풀이 타이머만 정리
   */
  clearQuestionTimer(roomId: string): void {
    this.clearTimer(roomId, 'questionTimer');
  }

  /**
   * 틱 인터벌만 정리
   */
  clearTickInterval(roomId: string): void {
    const timerSet = this.timers.get(roomId);

    if (timerSet?.tickInterval) {
      clearInterval(timerSet.tickInterval);
      timerSet.tickInterval = undefined;
    }
  }

  /**
   * 공통 타이머 정리 로직
   */
  private clearTimer(
    roomId: string,
    timerKey: 'readyTimer' | 'questionTimer' | 'reviewTimer',
  ): void {
    const timerSet = this.timers.get(roomId);

    if (timerSet?.[timerKey]) {
      clearTimeout(timerSet[timerKey]);
      timerSet[timerKey] = undefined;
    }
  }

  /**
   * 모든 타이머 정리
   */
  clearAllTimers(roomId: string): void {
    const timerSet = this.timers.get(roomId);

    if (!timerSet) {
      return;
    }

    if (timerSet.readyTimer) {
      clearTimeout(timerSet.readyTimer);
    }

    if (timerSet.questionTimer) {
      clearTimeout(timerSet.questionTimer);
    }

    if (timerSet.tickInterval) {
      clearInterval(timerSet.tickInterval);
    }

    if (timerSet.reviewTimer) {
      clearTimeout(timerSet.reviewTimer);
    }

    this.timers.delete(roomId);
  }

  /**
   * 타이머 세트 가져오기 또는 생성
   */
  private getOrCreateTimerSet(roomId: string): TimerSet {
    if (!this.timers.has(roomId)) {
      this.timers.set(roomId, {});
    }

    return this.timers.get(roomId);
  }
}
