import { useRoundPhase } from '@/feature/matching/useRound';

import TopBar from './in-game/TopBar';
import Preparing from './in-game/Preparing';
import Playing from './in-game/Playing';
import RoundResult from './in-game/RoundResult';

export default function InGame() {
  const { roundState } = useRoundPhase();

  return (
    <div className="relative z-10 flex h-full w-full flex-col">
      <TopBar />

      {/* Main Content */}
      {roundState === 'preparing' && <Preparing />}
      {roundState === 'playing' && <Playing />}
      {roundState === 'round-result' && <RoundResult />}
    </div>
  );
}
