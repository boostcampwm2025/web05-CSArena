import { Injectable } from '@nestjs/common';

interface TimerSet {
  readyTimer?: NodeJS.Timeout;
  questionTimer?: NodeJS.Timeout;
  reviewTimer?: NodeJS.Timeout;
}

interface TickRoom {
  endAt: number;
  onTick: (remainedSec: number) => void;
  active: boolean;
}

@Injectable()
export class RoundTimer {
  private timers = new Map<string, TimerSet>();
  private tickRooms = new Map<string, TickRoom>();
  private globalTickInterval?: NodeJS.Timeout;

  /**
   * 준비 카운트다운 타이머 시작
   */
  startReadyCountdown(roomId: string, duration: number, callback: () => void): void {
    this.clearReadyTimer(roomId);

    const timer = setTimeout(() => {
      callback();
      this.clearReadyTimer(roomId);
    }, duration * 1000);

    this.getOrCreateTimerSet(roomId).readyTimer = timer;
  }

  /**
   * 문제 풀이 타이머 시작
   */
  startQuestionTimer(roomId: string, duration: number, onTimeout: () => void): void {
    this.clearQuestionTimer(roomId);

    const timer = setTimeout(() => {
      onTimeout();
      this.clearQuestionTimer(roomId);
    }, duration * 1000);

    this.getOrCreateTimerSet(roomId).questionTimer = timer;
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
    this.clearReviewTimer(roomId);

    const timer = setTimeout(() => {
      callback();
      this.clearReviewTimer(roomId);
    }, duration * 1000);

    this.getOrCreateTimerSet(roomId).reviewTimer = timer;
  }

  /**
   * 문제 풀이 타이머만 정리
   */
  clearQuestionTimer(roomId: string): void {
    const timerSet = this.timers.get(roomId);

    if (timerSet?.questionTimer) {
      clearTimeout(timerSet.questionTimer);
      timerSet.questionTimer = undefined;
    }
  }

  /**
   * 틱 인터벌 정지 (방은 유지하고 비활성화만 함)
   */
  clearTickInterval(roomId: string): void {
    const room = this.tickRooms.get(roomId);

    if (room) {
      room.active = false;
    }
  }

  /**
   * 준비 타이머만 정리
   */
  private clearReadyTimer(roomId: string): void {
    const timerSet = this.timers.get(roomId);

    if (timerSet?.readyTimer) {
      clearTimeout(timerSet.readyTimer);
      timerSet.readyTimer = undefined;
    }
  }

  /**
   * 결과 타이머만 정리
   */
  private clearReviewTimer(roomId: string): void {
    const timerSet = this.timers.get(roomId);

    if (timerSet?.reviewTimer) {
      clearTimeout(timerSet.reviewTimer);
      timerSet.reviewTimer = undefined;
    }
  }

  /**
   * 모든 타이머 정리 (게임 종료 시 호출)
   */
  clearAllTimers(roomId: string): void {
    const timerSet = this.timers.get(roomId);

    if (timerSet) {
      if (timerSet.readyTimer) {
        clearTimeout(timerSet.readyTimer);
      }

      if (timerSet.questionTimer) {
        clearTimeout(timerSet.questionTimer);
      }

      if (timerSet.reviewTimer) {
        clearTimeout(timerSet.reviewTimer);
      }

      this.timers.delete(roomId);
    }

    // 게임 종료이므로 tickRooms에서 방 완전히 제거
    this.tickRooms.delete(roomId);

    // 모든 방이 종료되면 전역 인터벌 정리
    if (this.tickRooms.size === 0 && this.globalTickInterval) {
      clearInterval(this.globalTickInterval);
      this.globalTickInterval = undefined;
    }
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
