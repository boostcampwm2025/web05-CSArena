import { useUser } from '@/feature/auth/useUser';
import { useMatch } from '@/feature/matching/useMatch';
import { useRoundPhase, useRoundScore, useRoundTick } from '@/feature/matching/useRound';
import TierBadge from '@/shared/TierBadge';

export default function TopBar() {
  const { userData } = useUser();
  const { opponentInfo } = useMatch();
  const { roundState, roundIndex, totalRounds } = useRoundPhase();
  const { remainedSec } = useRoundTick();
  const { myTotal, opponentTotal } = useRoundScore();

  return (
    <div className="border-b-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95">
      <div className="item-center flex w-full justify-between gap-4 px-8 py-3">
        {/* Player 1 */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500">
            <i className="ri-user-star-line text-xl text-white" />
          </div>
          <div className="flex flex-col">
            <div
              className="text-sm font-bold text-cyan-300"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {userData?.nickname}
            </div>
            <div className="flex items-center gap-2">
              <TierBadge tier={userData?.tier ?? 'bronze'} className="text-xs" />
              <span
                className="text-xs text-gray-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {userData?.tierPoint ?? 0}
              </span>
            </div>
          </div>
          <div
            className="ml-2 text-2xl font-bold text-emerald-400"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {myTotal}
          </div>
        </div>

        {/* Round Info */}
        <div className="text-center">
          <div className="text-xl font-bold text-pink-400" style={{ fontFamily: 'Orbitron' }}>
            ROUND {roundIndex} / {totalRounds}
          </div>
          <div className="text-base font-bold text-amber-400" style={{ fontFamily: 'Orbitron' }}>
            {roundState === 'preparing' && `STARTING IN ${remainedSec}s...`}
            {roundState === 'playing' && `TIME: ${remainedSec}s`}
            {roundState === 'round-result' && `NEXT ROUND IN ${remainedSec}s...`}
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex items-center gap-3">
          <div
            className="mr-2 text-2xl font-bold text-emerald-400"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {opponentTotal}
          </div>
          <div className="flex flex-col items-end">
            <div
              className="text-sm font-bold text-pink-300"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {opponentInfo?.nickname ?? '???'}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs text-gray-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {opponentInfo?.tierPoint ?? 0}
              </span>
              <TierBadge tier={opponentInfo?.tier ?? 'bronze'} className="text-xs" />
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-pink-400 to-rose-500">
            <i className="ri-user-star-line text-xl text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
