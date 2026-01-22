import {
  Category,
  ProblemBankFilters,
  ProblemBankResponse,
  ProblemBankStatistics,
} from '@/shared/type';

const API_BASE = '/api/problem-bank';

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

  // 응답이 비어있을 수 있으므로 확인
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  // JSON이 아니면 빈 객체 반환
  return {} as T;
}

async function fetchProblemBank(
  accessToken: string | null,
  filters: Partial<ProblemBankFilters>,
): Promise<ProblemBankResponse> {
  const params = new URLSearchParams();

  if (filters.page) {
    params.append('page', filters.page.toString());
  }

  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    filters.categoryIds.forEach((id) => params.append('categoryIds', id.toString()));
  }

  if (filters.difficulty) {
    params.append('difficulty', filters.difficulty);
  }

  if (filters.result) {
    params.append('result', filters.result);
  }

  if (filters.isBookmarked !== undefined) {
    params.append('isBookmarked', filters.isBookmarked.toString());
  }

  if (filters.search) {
    params.append('search', filters.search);
  }

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return fetchWithAuth<ProblemBankResponse>(url, accessToken);
}

async function fetchStatistics(accessToken: string | null): Promise<ProblemBankStatistics> {
  return fetchWithAuth<ProblemBankStatistics>(`${API_BASE}/statistics`, accessToken);
}

async function updateBookmark(
  accessToken: string | null,
  id: number,
  isBookmarked: boolean,
): Promise<void> {
  await fetchWithAuth<void>(`${API_BASE}/${id}/bookmark`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ isBookmarked }),
  });
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/quiz/categories');

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  return response.json() as Promise<Category[]>;
}

export { ApiError, fetchProblemBank, fetchStatistics, updateBookmark, fetchCategories };
