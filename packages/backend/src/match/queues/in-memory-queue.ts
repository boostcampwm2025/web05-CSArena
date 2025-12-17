import { Injectable } from '@nestjs/common';
import { IMatchQueue, Match } from '../interfaces/match-queue.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryMatchQueue implements IMatchQueue {
  private queue: string[] = [];
  private processing = false;

  add(userId: string): Match | null {
    if (this.queue.includes(userId)) {
      return null;
    }

    if (this.processing) {
      this.queue.push(userId);

      return null;
    }

    this.processing = true;
    this.queue.push(userId);

    if (this.queue.length >= 2) {
      const [player1, player2] = this.queue.splice(0, 2);
      this.processing = false;

      return {
        player1,
        player2,
        roomId: randomUUID(),
      };
    }

    this.processing = false;

    return null;
  }

  remove(userId: string): void {
    const index = this.queue.indexOf(userId);

    if (index > -1) {
      this.queue.splice(index, 1);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
