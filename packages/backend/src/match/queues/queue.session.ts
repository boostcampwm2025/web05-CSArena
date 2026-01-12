import { UserInfo } from '../interfaces/user.interface';

export interface QueueSession {
  sessionId: string;
  socketId: string;
  userId: string;
  userInfo: UserInfo;
}
