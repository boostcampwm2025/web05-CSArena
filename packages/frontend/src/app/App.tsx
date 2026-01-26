import { useEffect } from 'react';

import { UserData } from '@/shared/type';
import { useScene } from '@/feature/useScene';
import { useUser } from '@/feature/auth/useUser';
import { refreshAccessToken } from '@/feature/auth/auth.api';

import { MatchProvider } from '@/feature/matching/useMatch';

import Home from '@/pages/home/Home';
import Match from '@/pages/match/Match';
import SinglePlay from '@/pages/single-play/SinglePlay';
import ProblemBank from '@/pages/problem-bank/ProblemBank';
import { SinglePlayProvider } from '@/feature/single-play/useRound';

export default function App() {
  const { scene } = useScene();
  const { setAccessToken, setUserData } = useUser();

  // 앱 마운트 시 OAuth 처리 및 Silent Refresh
  useEffect(() => {
    const initAuth = async () => {
      // 1. URL 해시에 토큰이 있는 경우 (OAuth 콜백 첫 진입)
      const hash = window.location.hash;

      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const userJson = params.get('user');

        if (accessToken) {
          setAccessToken(accessToken);

          if (userJson) {
            try {
              const user = JSON.parse(decodeURIComponent(userJson)) as UserData;
              setUserData(user);
            } catch (err) {
              console.error('Failed to parse user data:', err);
            }
          }

          // URL 해시 제거 및 홈으로 리다이렉트
          window.history.replaceState(null, '', window.location.pathname);

          // 씬 전환이 필요하다면 여기서 처리 (보통 홈으로 유지하거나 현재 씬 유지)
          return;
        }
      }

      // 2. 토큰은 없지만 새로고침된 경우 (Silent Refresh)
      try {
        const token = await refreshAccessToken(new AbortController().signal);

        if (token) {
          setAccessToken(token);

          // 유저 정보를 가져오는 추가 API 호출이 필요할 수 있음
          // 현재는 /api/auth/me 등을 호출하여 userData 복구
          const response = await fetch(`/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });

          if (response.ok) {
            const user = (await response.json()) as UserData;
            setUserData(user);
          }
        }
      } catch (err) {
        console.error('Silent refresh failed:', err);
        // 리프레시 토큰이 없거나 만료된 경우 아무것도 하지 않음 (비로그인 상태 유지)
      }
    };

    void initAuth();
  }, [setAccessToken, setUserData]);

  switch (scene) {
    case 'home':
      return <Home />;
    case 'match':
      return (
        <MatchProvider>
          <Match />
        </MatchProvider>
      );
    case 'single-play':
      return (
        <SinglePlayProvider>
          <SinglePlay />
        </SinglePlayProvider>
      );
    case 'problem-bank':
      return <ProblemBank />;
  }
}
