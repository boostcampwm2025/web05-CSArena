function buildQueryString(query?: ApiRequestOptions['query']): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();

  return qs ? `?${qs}` : '';
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
};

export async function request<TResponse>(
  endPoint: string,
  accessToken: string | null,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { method = 'GET', query, body, headers, credentials = 'include', signal } = options;

  const url = `${endPoint}${buildQueryString(query)}`;

  const res = await fetch(url, {
    method,
    credentials,
    signal,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as TResponse;
}
