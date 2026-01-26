import { MatchHistoryResponse, MyPageResponse, TierHistoryResponse } from '@/shared/type';

const API_BASE = '/api';

type MyPageData = MyPageResponse & TierHistoryResponse & MatchHistoryResponse;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth<T>(
  url: string,
  accessToken: string | null,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(401, 'Unauthorized');
    }

    const errorData = (await response.json().catch(() => ({ message: 'Unknown error' }))) as {
      message?: string;
    };
    throw new ApiError(response.status, errorData.message || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}

async function fetchMyPageData(accessToken: string | null): Promise<MyPageData> {
  // 3개 API 비동기 호출
  const [myPageResponse, tierHistoryResponse, matchHistoryResponse] = await Promise.all([
    fetchWithAuth<MyPageResponse>(`${API_BASE}/users/me`, accessToken),
    fetchWithAuth<TierHistoryResponse>(`${API_BASE}/users/me/tier-history`, accessToken),
    fetchWithAuth<MatchHistoryResponse>(`${API_BASE}/users/me/match-history`, accessToken),
  ]);

  return {
    ...myPageResponse,
    ...tierHistoryResponse,
    ...matchHistoryResponse,
  };
}

export { fetchMyPageData, ApiError };
export type { MyPageData };
