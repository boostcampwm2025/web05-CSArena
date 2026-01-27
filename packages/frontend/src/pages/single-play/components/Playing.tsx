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
            {curQuestion?.type === 'multiple_choice' ? (
              <span>
                {curQuestion.question}
                <br />
                <br />
                {`A: ${curQuestion.options.A}`}
                <br />
                {`B: ${curQuestion.options.B}`}
                <br />
                {`C: ${curQuestion.options.C}`}
                <br />
                {`D: ${curQuestion.options.D}`}
              </span>
            ) : (
              <span>{curQuestion?.question}</span>
            )}
          </div>

          {/* Answer Input */}
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Type your answer here..."
              className="border-2 border-cyan-400 bg-slate-700 px-4 py-3 text-base text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              style={{ fontFamily: 'Orbitron' }}
              onChange={(e) => setAnswer(e.target.value)}
              autoFocus
            />
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
        </div>
      </div>
    </div>
  );
}
