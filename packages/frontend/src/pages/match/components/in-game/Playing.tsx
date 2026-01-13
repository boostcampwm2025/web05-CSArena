import { useQuestion, useRoundTick } from '@/feature/matching/useRound';
import { usePlaying } from '@/pages/match/hooks/usePlaying';

export default function Playing() {
  const { category, difficulty, content } = useQuestion();
  const { remainedSec } = useRoundTick();
  const { isSubmit, isSubmitting, setAnswer, onClickSubmitBtn } = usePlaying();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Question Card */}
        <div className="flex flex-col items-stretch justify-center gap-4 border-4 border-purple-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-6 shadow-2xl shadow-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="border-2 border-purple-300 bg-purple-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  {category[0]}
                </p>
              </div>
              <div className="border-2 border-amber-300 bg-amber-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  {category[1]}
                </p>
              </div>
              <div className="border-2 border-emerald-300 bg-emerald-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  100 PTS
                </p>
              </div>
              {difficulty < 3 && (
                <div className="border-2 border-green-300 bg-green-500 px-4 py-2">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                    Easy
                  </p>
                </div>
              )}
              {difficulty === 3 && (
                <div className="border-2 border-yellow-300 bg-yellow-500 px-4 py-2">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                    Medium
                  </p>
                </div>
              )}
              {difficulty > 3 && (
                <div className="border-2 border-red-300 bg-red-500 px-4 py-2">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                    Hard
                  </p>
                </div>
              )}
            </div>
            <div className="text-lg font-bold text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
              <i className="ri-time-line mr-2"></i>
              {remainedSec}s
            </div>
          </div>

          <div className="text-xl leading-relaxed text-white" style={{ fontFamily: 'Orbitron' }}>
            {content?.question}
            {content?.type === 'multiple' &&
              `\n\nA: ${content.option[0]}\nB: ${content.option[1]}\nC: ${content.option[2]}\nD: ${content.option[3]}`}
          </div>

          {/* Answer Input */}
          {isSubmit ? (
            <div className="item-center flex justify-center">
              <p className="text-3xl text-green-400" style={{ fontFamily: 'Orbitron' }}>
                Your response has been submitted
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Type your answer here..."
                className="border-2 border-cyan-400 bg-slate-700 px-4 py-3 text-base text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                style={{ fontFamily: 'Orbitron' }}
                autoFocus
                onChange={(e) => setAnswer(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                className="w-full border-4 border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 py-3 font-bold text-white shadow-lg shadow-cyan-500/50 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-blue-400"
                disabled={isSubmit || isSubmitting}
                onClick={onClickSubmitBtn}
                style={{ fontFamily: 'Orbitron' }}
              >
                <i className="ri-send-plane-fill mr-2"></i>
                SUBMIT ANSWER
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
