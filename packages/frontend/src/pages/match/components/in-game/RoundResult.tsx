import { useUser } from '@/feature/auth/useUser';
import { useMatch } from '@/feature/matching/useMatch';
import { useRoundPhase, useRoundScore, useRoundTick } from '@/feature/matching/useRound';

export default function RoundResult() {
  const { userData } = useUser();
  const { opponentInfo } = useMatch();
  const { roundIndex } = useRoundPhase();
  const { remainedSec } = useRoundTick();
  const { myAnswer, myIsCorrect, opponentAnswer, opponentIsCorrect, bestAnswer } = useRoundScore();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <div
            className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-black text-transparent"
            style={{ fontFamily: '"Press Start 2P"' }}
          >
            ROUND {roundIndex} RESULT
          </div>
          <div className="text-xl font-bold text-amber-400" style={{ fontFamily: 'Orbitron' }}>
            Next round in {remainedSec}...
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Player Answer */}
          <div className="flex flex-col gap-4 border-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-5 shadow-2xl shadow-cyan-500/30">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500">
                <i className="ri-user-star-line text-2xl text-white" />
              </div>
              <div className="text-lg font-bold text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
                {userData?.nickname}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-xs text-purple-300" style={{ fontFamily: 'Orbitron' }}>
                YOUR ANSWER
              </div>
              <div className="text-base text-white" style={{ fontFamily: 'Orbitron' }}>
                {myAnswer}
              </div>
            </div>
            {myIsCorrect ? (
              <div className="border-2 border-emerald-400 bg-emerald-500/20 py-2 text-center">
                <p
                  className="text-base font-bold text-emerald-400"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  ✓ CORRECT
                </p>
              </div>
            ) : (
              <div className={'border-2 border-red-400 bg-red-500/20 py-2 text-center'}>
                <p
                  className={'text-base font-bold text-red-400'}
                  style={{ fontFamily: 'Orbitron' }}
                >
                  ✗ WRONG
                </p>
              </div>
            )}
          </div>

          {/* Opponent Answer */}
          <div className="flex flex-col gap-4 border-4 border-pink-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-5 shadow-2xl shadow-pink-500/30">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-pink-400 to-rose-500">
                <i className="ri-user-star-line text-2xl text-white" />
              </div>
              <div className="text-lg font-bold text-pink-300" style={{ fontFamily: 'Orbitron' }}>
                {opponentInfo?.nickname}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="mb-1 text-xs text-purple-300" style={{ fontFamily: 'Orbitron' }}>
                OPPONENT ANSWER
              </div>
              <div className="text-base text-white" style={{ fontFamily: 'Orbitron' }}>
                {opponentAnswer}
              </div>
            </div>
            {opponentIsCorrect ? (
              <div className="border-2 border-emerald-400 bg-emerald-500/20 py-2 text-center">
                <p
                  className="text-base font-bold text-emerald-400"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  ✓ CORRECT
                </p>
              </div>
            ) : (
              <div className={'border-2 border-red-400 bg-red-500/20 py-2 text-center'}>
                <p
                  className={'text-base font-bold text-red-400'}
                  style={{ fontFamily: 'Orbitron' }}
                >
                  ✗ WRONG
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Correct Answer */}
        <div className="flex flex-col gap-2 border-4 border-amber-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4 shadow-2xl shadow-amber-500/30">
          <div className="text-sm font-bold text-amber-400" style={{ fontFamily: 'Orbitron' }}>
            <i className="ri-lightbulb-line mr-2" />
            CORRECT ANSWER
          </div>
          <div className="text-base text-white" style={{ fontFamily: 'Orbitron' }}>
            {bestAnswer}
          </div>
        </div>
      </div>
    </div>
  );
}
