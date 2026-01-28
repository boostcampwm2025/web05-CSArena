import { UserInfo } from '../../user/interfaces';

export interface QueueSession {
  sessionId: string;
  socketId: string;
  userId: string;
  userInfo: UserInfo;
}
