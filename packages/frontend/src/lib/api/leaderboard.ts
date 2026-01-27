import { request } from './request';
import { LeaderboardResponse, LeaderboardType } from '../../pages/leaderboard/types';

export const getLeaderboard = async <T extends LeaderboardType>(
  type: T,
  accessToken: string,
  signal?: AbortSignal,
): Promise<LeaderboardResponse<T>> => {
  return request<LeaderboardResponse<T>>('/leaderboard', accessToken, {
    method: 'GET',
    query: { type },
    signal,
  });
};
