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
    this.startTimer(roomId, 'readyTimer', duration, callback);
  }

  /**
   * 문제 풀이 타이머 시작
   */
  startQuestionTimer(roomId: string, duration: number, onTimeout: () => void): void {
    this.startTimer(roomId, 'questionTimer', duration, onTimeout);
  }

  /**
   * 시간 동기화 틱 인터벌 시작 (전역 틱 방식)
   *
   * 게임 시작 시 방을 등록하고, 각 라운드마다 endAt만 업데이트합니다.
   * 방은 게임이 완전히 종료될 때까지 유지됩니다.
   */
  startTickInterval(
    roomId: string,
    totalDuration: number,
    onTick: (remainedSec: number) => void,
  ): void {
    const endAt = Date.now() + totalDuration * 1000;

    // 방이 이미 존재하면 endAt과 onTick만 업데이트, 없으면 새로 생성
    const existingRoom = this.tickRooms.get(roomId);

    if (existingRoom) {
      existingRoom.endAt = endAt;
      existingRoom.onTick = onTick;
      existingRoom.active = true;
    } else {
      this.tickRooms.set(roomId, { endAt, onTick, active: true });
    }

    // 즉시 첫 틱 전송
    onTick(totalDuration);

    // 전역 틱 인터벌이 없으면 시작
    if (!this.globalTickInterval) {
      this.startGlobalTick();
    }
  }

  /**
   * 전역 틱 인터벌 시작 (모든 방에 대해 1초마다 브로드캐스팅)
   *
   * 단일 setInterval로 모든 방의 타이머를 관리합니다.
   * 방이 100개여도 setInterval은 1개만 사용됩니다.
   */
  private startGlobalTick(): void {
    this.globalTickInterval = setInterval(() => {
      const now = Date.now();
      let hasActiveRoom = false;

      // 모든 방을 순회하며 활성 상태인 방만 처리
      for (const room of this.tickRooms.values()) {
        // 비활성 방은 스킵
        if (!room.active) {
          continue;
        }

        hasActiveRoom = true;
        const remainedSec = Math.max(0, Math.ceil((room.endAt - now) / 1000));
        room.onTick(remainedSec);

        // 현재 라운드 시간이 종료되면 비활성화 (다음 라운드에서 재활성화됨)
        if (remainedSec <= 0) {
          room.active = false;
        }
      }

      // 활성 방이 없으면 전역 인터벌 정리 (새로운 라운드 시작 시 다시 생성됨)
      if (!hasActiveRoom) {
        clearInterval(this.globalTickInterval);
        this.globalTickInterval = undefined;
      }
    }, 1000);
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
   * 틱 인터벌 정지 (방은 유지하고 비활성화만 함)
   */
  clearTickInterval(roomId: string): void {
    const room = this.tickRooms.get(roomId);

    if (room) {
      room.active = false;
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
