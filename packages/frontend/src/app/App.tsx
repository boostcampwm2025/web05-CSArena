import { useEffect } from 'react';

import { getUserData } from '@/lib/socket';

import { useScene } from '@/feature/useScene';
import { useUser } from '@/feature/auth/useUser';

import { MatchProvider } from '@/feature/matching/useMatch';

import Home from '@/pages/home/Home';
import Match from '@/pages/match/Match';
import SinglePlay from '@/pages/single-play/SinglePlay';
import ProblemBank from '@/pages/problem-bank/ProblemBank';
import { SinglePlayProvider } from '@/feature/single-play/useRound';

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
