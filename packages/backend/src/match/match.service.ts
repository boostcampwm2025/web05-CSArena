import { Injectable } from '@nestjs/common';
import { IMatchQueue, Match } from './interfaces/match-queue.interface';
import { InMemoryMatchQueue } from './queues/in-memory-queue';

@Injectable()
export class MatchService {
  private matchQueue: IMatchQueue;

  constructor() {
    this.matchQueue = new InMemoryMatchQueue();
  }

  addToQueue(userId: string): Match | null {
    return this.matchQueue.add(userId);
  }

  removeFromQueue(userId: string): void {
    this.matchQueue.remove(userId);
  }

  getQueueSize(): number {
    return this.matchQueue.getQueueSize();
  }
}
