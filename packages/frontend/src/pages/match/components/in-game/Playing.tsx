import { useQuestion, useRoundTick } from '@/feature/matching/useRound';
import { usePlaying } from '@/pages/match/hooks/usePlaying';

export default function Playing() {
  const { category, difficulty, point, content } = useQuestion();
  const { remainedSec } = useRoundTick();
  const { isSubmit, isSubmitting, opponentSubmitted, answer, setAnswer, onClickSubmitBtn } =
    usePlaying();

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
                  {point} PTS
                </p>
              </div>
              {difficulty === 'Easy' && (
                <div className="border-2 border-green-300 bg-green-500 px-4 py-2">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                    Easy
                  </p>
                </div>
              )}
              {difficulty === 'Medium' && (
                <div className="border-2 border-yellow-300 bg-yellow-500 px-4 py-2">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                    Medium
                  </p>
                </div>
              )}
              {difficulty === 'Hard' && (
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
            {content?.type === 'multiple' && (
              <span>
                <br />
                <br />
                {`A: ${content.option[0]}`}
                <br />
                {`B: ${content.option[1]}`}
                <br />
                {`C: ${content.option[2]}`}
                <br />
                {`D: ${content.option[3]}`}
              </span>
            )}
          </div>

          {/* Answer Input */}
          {isSubmit || isSubmitting ? (
            <div className="flex justify-center py-12">
              <div className="relative flex flex-col items-center gap-6 border-4 border-cyan-400 bg-gradient-to-br from-slate-900/95 via-purple-900/30 to-slate-900/95 p-12 shadow-2xl shadow-cyan-500/40">
                {/* 회전 로딩 스피너 */}
                <div className="relative">
                  <div className="h-24 w-24 animate-spin rounded-full border-8 border-slate-700 border-t-cyan-400 shadow-lg shadow-cyan-400/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i
                      className={`text-5xl ${opponentSubmitted ? 'ri-check-line text-green-400' : 'ri-user-line text-purple-400'}`}
                    ></i>
                  </div>
                </div>

                {/* 메시지 */}
                <div className="flex flex-col items-center gap-2">
                  <p
                    className="text-3xl font-bold text-cyan-300"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    {opponentSubmitted ? 'GRADING IN PROGRESS' : 'WAITING FOR OPPONENT'}
                  </p>
                  <p
                    className="flex items-center gap-1 text-lg text-slate-400"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    {opponentSubmitted ? '답안을 채점하고 있습니다' : '상대방이 답을 작성 중입니다'}
                    <span className="flex">
                      <span className="animate-[bounce_1.4s_ease-in-out_0s_infinite]">.</span>
                      <span className="animate-[bounce_1.4s_ease-in-out_0.2s_infinite]">.</span>
                      <span className="animate-[bounce_1.4s_ease-in-out_0.4s_infinite]">.</span>
                    </span>
                  </p>
                </div>

                {/* 네온 글로우 효과 */}
                <div className="absolute inset-0 -z-10 animate-pulse border-4 border-cyan-400/30 blur-xl"></div>
              </div>
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
                className="w-full border-4 border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 py-3 font-bold text-white shadow-lg shadow-cyan-500/50 transition-all duration-200 enabled:hover:scale-105 enabled:hover:from-cyan-400 enabled:hover:to-blue-400 disabled:border-cyan-300/40 disabled:from-cyan-900/50 disabled:to-blue-900/50 disabled:text-white/70 disabled:shadow-cyan-500/20"
                disabled={answer.trim() === '' || isSubmit || isSubmitting}
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
