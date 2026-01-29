import { useEffect } from 'react';

import { UserData } from '@/shared/type';
import { useScene } from '@/feature/useScene';
import { useUser } from '@/feature/auth/useUser';
import { fetchUserData, handleOAuthCallback, refreshAccessToken } from '@/feature/auth/auth.api';

import { MatchProvider } from '@/feature/matching/useMatch';

import Home from '@/pages/home/Home';
import Match from '@/pages/match/Match';
import SinglePlay from '@/pages/single-play/SinglePlay';
import ProblemBank from '@/pages/problem-bank/ProblemBank';
import MyPage from '@/pages/my-page/MyPage';
import Leaderboard from '@/pages/leaderboard/Leaderboard';
import { SinglePlayProvider } from '@/feature/single-play/useRound';

export default function App() {
  const { scene } = useScene();
  const { setAccessToken, setUserData } = useUser();

  // 앱 마운트 시 OAuth 처리 및 Silent Refresh
  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      // 1. URL 해시에 토큰이 있는 경우 (OAuth 콜백 첫 진입)
      try {
        const data = handleOAuthCallback();

        if (!data.ok) {
          throw new Error(data.err);
        }

        const { accessToken, userData } = data;

        setAccessToken(accessToken);
        const mappedUserData: UserData = {
          ...userData,
          profileImage: userData.userProfile,
        };
        setUserData(mappedUserData);

        window.history.replaceState(null, '', '/');

        return;
      } catch (err) {
        console.error(`Failed to login with OAuth. ${err}`);
      }

      // 2. 토큰은 없지만 새로고침된 경우 (Silent Refresh)
      try {
        const token = await refreshAccessToken(controller.signal);

        if (token) {
          setAccessToken(token);

          const userData = await fetchUserData(token, controller.signal);

          setUserData((prev) => {
            if (!prev || !userData) {
              return prev;
            }

            return {
              ...prev,
              nickname: userData.profile.nickname,
              profileImage: userData.profile.profileImage,
              tier: userData.rank.tier,
              level: userData.levelInfo.level,
              needExpPoint: userData.levelInfo.needExpPoint,
              remainedExpPoint: userData.levelInfo.remainedExpPoint,
            };
          });
        }
      } catch (err) {
        console.error('Silent refresh failed:', err);
        // 리프레시 토큰이 없거나 만료된 경우 아무것도 하지 않음 (비로그인 상태 유지)
      }
    };

    void initAuth();

    return () => {
      controller.abort();
    };
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
    case 'my-page':
      return <MyPage />;
    case 'leaderboard':
      return <Leaderboard />;
  }
}
