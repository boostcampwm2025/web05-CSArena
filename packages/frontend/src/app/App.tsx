import { useEffect } from 'react';

import { getUserData } from '@/lib/socket';

import { useScene } from '@/feature/useScene';
import { useUser } from '@/feature/auth/useUser';

import { MatchProvider } from '@/feature/matching/useMatch';

import Home from '@/pages/home/Home';
import Match from '@/pages/match/Match';

export default function App() {
  const { scene } = useScene();
  const { setUserData } = useUser();

  useEffect(() => setUserData(getUserData()), [setUserData]);

  switch (scene) {
    case 'home':
      return <Home />;
    case 'match':
      return (
        <MatchProvider>
          <Match />
        </MatchProvider>
      );
  }
}
