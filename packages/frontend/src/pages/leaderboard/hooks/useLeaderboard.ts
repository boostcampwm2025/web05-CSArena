import { useCallback, useEffect, useState } from 'react';

import { useUser } from '@/feature/auth/useUser';
import { getLeaderboard } from '@/lib/api/leaderboard';
import {
  LeaderboardResponse,
  LeaderboardType,
  MultiRankingItem,
  SingleRankingItem,
} from '../types';

export function useLeaderboard() {
  const { accessToken } = useUser();
  const [currentType, setCurrentType] = useState<LeaderboardType>('multi');
  const [data, setData] = useState<LeaderboardResponse<LeaderboardType> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!accessToken) {
      setData(null);
      setError(null);
      setIsLoading(false);

      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await getLeaderboard(currentType, accessToken);
      setData(response);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, currentType]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const toggleType = useCallback(() => {
    setCurrentType((prev) => (prev === 'multi' ? 'single' : 'multi'));
  }, []);

  return {
    currentType,
    data,
    isLoading,
    error,
    toggleType,
  };
}

// 타입 가드 (UI에서 사용)
export function isMultiRanking(
  item: MultiRankingItem | SingleRankingItem,
): item is MultiRankingItem {
  return (item as MultiRankingItem).tier !== undefined;
}
