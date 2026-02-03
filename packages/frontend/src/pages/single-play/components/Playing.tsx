import { usePlaying } from '@/pages/single-play/hooks/usePlaying';

export default function Playing() {
  const { answer, setAnswer, curQuestion, isSubmitting, onClickSubmitBtn } = usePlaying();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex w-full max-w-6xl flex-col gap-10">
        <div
          className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-4xl font-black text-transparent"
          style={{ fontFamily: '"Press Start 2P"' }}
        >
          Question
        </div>

        {/* Question Card */}
        <div className="flex flex-col items-stretch justify-center gap-4 border-4 border-purple-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-6 shadow-2xl shadow-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="border-2 border-purple-300 bg-purple-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  {curQuestion?.category[0]}
                </p>
              </div>
              <div className="border-2 border-amber-300 bg-amber-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  {curQuestion?.category[1]}
                </p>
              </div>
              <div className="border-2 border-emerald-300 bg-emerald-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  100 PTS
                </p>
              </div>
              <div className="border-2 border-green-300 bg-green-500 px-4 py-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  {curQuestion?.difficulty}
                </p>
              </div>
            </div>
          </div>

          <div className="text-xl leading-relaxed text-white" style={{ fontFamily: 'Orbitron' }}>
            {curQuestion?.question}
          </div>

          {/* Answer Input */}
          {isSubmitting && curQuestion?.type !== 'multiple_choice' ? (
            <div className="flex justify-center py-12">
              <div className="relative flex flex-col items-center gap-6 border-4 border-cyan-400 bg-gradient-to-br from-slate-900/95 via-purple-900/30 to-slate-900/95 p-12 shadow-2xl shadow-cyan-500/40">
                <div className="relative">
                  <div className="h-24 w-24 animate-spin rounded-full border-8 border-slate-700 border-t-cyan-400 shadow-lg shadow-cyan-400/50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="ri-quill-pen-line text-5xl text-cyan-400" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p
                    className="text-3xl font-bold text-cyan-300"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    GRADING IN PROGRESS
                  </p>
                  <p
                    className="flex items-center gap-1 text-lg text-slate-400"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    답안을 채점하고 있습니다
                    <span className="flex">
                      <span className="animate-[bounce_1.4s_ease-in-out_0s_infinite]">.</span>
                      <span className="animate-[bounce_1.4s_ease-in-out_0.2s_infinite]">.</span>
                      <span className="animate-[bounce_1.4s_ease-in-out_0.4s_infinite]">.</span>
                    </span>
                  </p>
                </div>
                <div className="absolute inset-0 -z-10 animate-pulse border-4 border-cyan-400/30 blur-xl" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {curQuestion?.type === 'multiple_choice' ? (
                <div className="flex flex-col gap-3">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <button
                      key={key}
                      className={`flex items-center gap-4 border-2 px-4 py-3 text-left text-base text-white transition-all duration-200 hover:border-purple-400 ${answer === key ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/30' : 'border-slate-500 bg-slate-700/50'}`}
                      style={{ fontFamily: 'Orbitron' }}
                      onClick={() => setAnswer(key)}
                      disabled={isSubmitting}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 text-sm font-bold ${answer === key ? 'border-cyan-300 bg-cyan-500 text-white' : 'border-slate-400 bg-slate-600 text-slate-300'}`}
                      >
                        {key}
                      </span>
                      <span>{curQuestion.options[key]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Type your answer here..."
                  className="border-2 border-cyan-400 bg-slate-700 px-4 py-3 text-base text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  style={{ fontFamily: 'Orbitron' }}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) {
                      return;
                    }

                    if (e.key === 'Enter' && answer.trim() !== '') {
                      void onClickSubmitBtn();
                    }
                  }}
                  autoFocus
                />
              )}
              <button
                className="w-full border-4 border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 py-3 font-bold text-white shadow-lg shadow-cyan-500/50 transition-all duration-200 enabled:hover:scale-105 enabled:hover:from-cyan-400 enabled:hover:to-blue-400 disabled:border-cyan-300/40 disabled:from-cyan-900/50 disabled:to-blue-900/50 disabled:text-white/70 disabled:shadow-cyan-500/20"
                style={{ fontFamily: 'Orbitron' }}
                onClick={onClickSubmitBtn}
                disabled={isSubmitting || answer.trim() === ''}
              >
                <i className="ri-send-plane-fill mr-2" />
                SUBMIT ANSWER
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
