import { useEffect } from 'react';

import { UserData } from '@/shared/type';
import { useScene } from '@/feature/useScene';
import { useUser } from '@/feature/auth/useUser';

import { MatchProvider } from '@/feature/matching/useMatch';

import Home from '@/pages/home/Home';
import Match from '@/pages/match/Match';
import ProblemBank from '@/pages/problem-bank/ProblemBank';

export default function App() {
  const { scene, setScene } = useScene();
  const { setUserData } = useUser();

  // GitHub OAuth 콜백 처리
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const userJson = params.get('user');

      if (accessToken) {
        // localStorage에 토큰 저장
        localStorage.setItem('accessToken', accessToken);

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
        setScene('home');
      }
    }
  }, [setUserData, setScene]);

  switch (scene) {
    case 'home':
      return <Home />;
    case 'match':
      return (
        <MatchProvider>
          <Match />
        </MatchProvider>
      );
    case 'problem-bank':
      return <ProblemBank />;
  }
}
