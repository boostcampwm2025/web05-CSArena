export interface Match {
  player1: string;
  player2: string;
  roomId: string;
  player1QueuedAt?: number;
  player2QueuedAt?: number;
}

export interface QueuedPlayer {
  userId: string;
  eloRating: number;
  queuedAt: number; // timestamp
}

export interface IMatchQueue {
  add(userId: string, eloRating: number): Match | null;
  remove(userId: string): void;
  getQueueSize(): number;
}
