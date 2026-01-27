import { useRoundResult } from '@/pages/single-play/hooks/useRoundResult';

export default function RoundResult() {
  const {
    nickname,
    curQuestion,
    submittedAnswer,
    isCorrect,
    aiFeedback,
    isFetchingQuestion,
    onClickNextBtn,
  } = useRoundResult();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div
          className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-4xl font-black text-transparent"
          style={{ fontFamily: '"Press Start 2P"' }}
        >
          RESULT
        </div>

        {/* Player Answer */}
        <div className="flex flex-col gap-4 border-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-5 shadow-2xl shadow-cyan-500/30">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500">
              <i className="ri-user-star-line text-2xl text-white" />
            </div>
            <div className="text-lg font-bold text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
              {nickname}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-xs text-purple-300" style={{ fontFamily: 'Orbitron' }}>
              YOUR ANSWER
            </div>
            <div className="text-base text-white" style={{ fontFamily: 'Orbitron' }}>
              {submittedAnswer}
            </div>
          </div>
          {isCorrect ? (
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
              <p className={'text-base font-bold text-red-400'} style={{ fontFamily: 'Orbitron' }}>
                ✗ WRONG
              </p>
            </div>
          )}
        </div>

        {/* Correct Answer */}
        <div className="flex flex-col gap-2 border-4 border-amber-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4 shadow-2xl shadow-amber-500/30">
          <div className="text-sm font-bold text-amber-400" style={{ fontFamily: 'Orbitron' }}>
            <i className="ri-lightbulb-line mr-2" />
            CORRECT ANSWER
          </div>
          <div className="text-base text-white" style={{ fontFamily: 'Orbitron' }}>
            {curQuestion?.type === 'multiple_choice' && curQuestion?.answer}
            {curQuestion?.type === 'short_answer' && curQuestion?.answer}
            {curQuestion?.type === 'essay' && curQuestion?.sampleAnswer}
          </div>
        </div>

        {/* AI Feedback */}
        <div className="flex flex-col gap-2 border-4 border-purple-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4 shadow-2xl shadow-purple-500/30">
          <div className="text-sm font-bold text-purple-400" style={{ fontFamily: 'Orbitron' }}>
            <i className="ri-robot-2-line mr-2" />
            AI Feedback
          </div>
          <div className="text-base text-white" style={{ fontFamily: 'Orbitron' }}>
            {aiFeedback}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full justify-end">
          <button
            className="border-2 border-slate-400 bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-3 text-2xl font-bold text-white transition-all duration-200 enabled:hover:scale-105 enabled:hover:from-slate-500 enabled:hover:to-slate-600 disabled:from-slate-500/60 disabled:to-slate-600/60 disabled:text-white/60"
            style={{ fontFamily: 'Orbitron' }}
            onClick={onClickNextBtn}
            disabled={isFetchingQuestion}
          >
            <i className="ri-play-fill mr-2" />
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
