import { useUser } from '@/feature/auth/useUser';
import { useMatch } from '@/feature/matching/useMatch';
import { useRoundPhase, useRoundScore, useRoundTick } from '@/feature/matching/useRound';
import ProfileAvatar from '@/shared/ProfileAvatar';

export default function RoundResult() {
  const { userData } = useUser();
  const { opponentInfo } = useMatch();
  const { roundIndex } = useRoundPhase();
  const { remainedSec } = useRoundTick();
  const { myAnswer, myIsCorrect, opponentAnswer, opponentIsCorrect, bestAnswer, explanation } =
    useRoundScore();

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
              <ProfileAvatar
                profileImage={userData?.profileImage}
                nickname={userData?.nickname}
                size="sm"
                borderStyle="white"
              />
              <div className="text-lg font-bold text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
                {userData?.nickname}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-xs text-purple-300" style={{ fontFamily: 'Orbitron' }}>
                YOUR ANSWER
              </div>
              <div
                className="whitespace-pre-wrap text-base text-white"
                style={{ fontFamily: 'Orbitron' }}
              >
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
              <ProfileAvatar
                profileImage={opponentInfo?.profileImage}
                nickname={opponentInfo?.nickname}
                size="sm"
                borderStyle="white"
              />
              <div className="text-lg font-bold text-pink-300" style={{ fontFamily: 'Orbitron' }}>
                {opponentInfo?.nickname}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="mb-1 text-xs text-purple-300" style={{ fontFamily: 'Orbitron' }}>
                OPPONENT ANSWER
              </div>
              <div
                className="whitespace-pre-wrap text-base text-white"
                style={{ fontFamily: 'Orbitron' }}
              >
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
          <div
            className="whitespace-pre-wrap text-base text-white"
            style={{ fontFamily: 'Orbitron' }}
          >
            {bestAnswer}
          </div>
        </div>

        {/* AI Feedback */}
        <div className="flex flex-col gap-2 border-4 border-purple-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4 shadow-2xl shadow-purple-500/30">
          <div className="text-sm font-bold text-purple-400" style={{ fontFamily: 'Orbitron' }}>
            <i className="ri-robot-2-line mr-2" />
            AI Feedback
          </div>
          <div
            className="whitespace-pre-wrap text-base text-white"
            style={{ fontFamily: 'Orbitron' }}
          >
            {explanation}
          </div>
        </div>
      </div>
    </div>
  );
}
