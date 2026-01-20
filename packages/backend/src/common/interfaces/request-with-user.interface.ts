import { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    visibleId: string;
    nickname: string;
    oauthProvider: 'github';
  };
}
