export function login() {
  window.location.replace(`/api/auth/github`);
}

export async function logout(signal: AbortSignal) {
  try {
    const res = await fetch(`/api/auth/logout`, {
      credentials: 'include',
      signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to logout. status: ${res.status}, message: ${res.statusText}`);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return;
    }

    // TODO: 에러 모달 출력
  }
}

export function handleOAuthCallback() {
  const hash = window.location.hash;

  if (!hash || hash.length <= 1) {
    return { ok: false, err: 'There is no hash.' };
  }

  const params = new URLSearchParams(hash.substring(1));

  const token = params.get('access_token');

  if (!token) {
    return { ok: false, err: 'There is no token.' };
  }

  const userRaw = params.get('user');

  if (!userRaw) {
    return { ok: false, err: 'There is no user data.' };
  }

  window.history.replaceState(null, '', '/');

  return { ok: true, accessToken: token, userData: JSON.parse(decodeURIComponent(userRaw)) };
}

export async function refreshAccessToken(signal: AbortSignal) {
  const res = await fetch(`/api/auth/refresh`, {
    credentials: 'include',
    signal,
  });

  if (!res.ok) {
    throw new Error(
      `Failed to get refresh token. status: ${res.status}, message: ${res.statusText}`,
    );
  }

  const data = (await res.json()) as { accessToken: string };

  return data.accessToken;
}
