import { useScene } from '@/feature/useScene';

import { MatchProvider } from '@/feature/matching/useMatch';

import Home from '@/pages/home/Home';
import Match from '@/pages/match/Match';
import ProblemBank from '@/pages/problem-bank/ProblemBank';

export default function App() {
  const { scene } = useScene();

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
