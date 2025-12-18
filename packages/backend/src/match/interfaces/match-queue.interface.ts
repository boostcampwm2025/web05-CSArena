export interface Match {
  player1: string;
  player2: string;
  roomId: string;
}

export interface IMatchQueue {
  add(userId: string): Match | null;
  remove(userId: string): void;
  getQueueSize(): number;
}
