import { ProblemBankItem } from '@/shared/type';

interface ProblemDetailModalProps {
  problem: ProblemBankItem;
  onClose: () => void;
  onBookmarkToggle: (id: number, currentState: boolean) => void;
}

export default function ProblemDetailModal({
  problem,
  onClose,
  onBookmarkToggle,
}: ProblemDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border-2 border-cyan-400 bg-slate-900/95 backdrop-blur-sm">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-cyan-400 bg-slate-900/95 p-4 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
            💾 PROBLEM DETAILS
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-cyan-400 transition-colors hover:text-cyan-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* Question Section */}
          <div className="rounded border-2 border-purple-400 bg-slate-800/50 p-4">
            <div
              className="mb-2 flex items-center gap-2 text-sm font-bold text-purple-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <span>📝</span>
              <span>QUESTION</span>
            </div>
            <div className="text-sm text-white">{problem.questionContent}</div>

            {/* Tags & Difficulty */}
            <div className="mt-3 flex items-center gap-4">
              <div className="flex flex-wrap gap-1">
                {problem.categories.map((category, idx) => (
                  <span
                    key={idx}
                    className="rounded border border-cyan-400 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-400"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    {category}
                  </span>
                ))}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  problem.difficulty === 'easy'
                    ? 'bg-green-500/20 text-green-400'
                    : problem.difficulty === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                }`}
                style={{ fontFamily: 'Orbitron' }}
              >
                {problem.difficulty.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Your Answer Section */}
          <div className="rounded border-2 border-cyan-400 bg-slate-800/50 p-4">
            <div
              className="mb-2 flex items-center gap-2 text-sm font-bold text-cyan-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <span>✍️</span>
              <span>YOUR ANSWER</span>
              {problem.answerStatus === 'correct' && (
                <span className="text-green-400">✓ CORRECT</span>
              )}
              {problem.answerStatus === 'incorrect' && (
                <span className="text-red-400">✗ INCORRECT</span>
              )}
              {problem.answerStatus === 'partial' && (
                <span className="text-yellow-400">◐ PARTIAL</span>
              )}
            </div>
            <div className="whitespace-pre-wrap text-sm text-white">
              {problem.userAnswer || '답변이 없습니다.'}
            </div>
          </div>

          {/* Correct Answer Section */}
          <div className="rounded border-2 border-green-400 bg-slate-800/50 p-4">
            <div
              className="mb-2 flex items-center gap-2 text-sm font-bold text-green-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <span>✓</span>
              <span>CORRECT ANSWER</span>
            </div>
            <div className="whitespace-pre-wrap text-sm text-white">{problem.correctAnswer}</div>
          </div>

          {/* AI Feedback Section */}
          {problem.aiFeedback && (
            <div className="rounded border-2 border-pink-400 bg-slate-800/50 p-4">
              <div
                className="mb-2 flex items-center gap-2 text-sm font-bold text-pink-400"
                style={{ fontFamily: 'Orbitron' }}
              >
                <span>🤖</span>
                <span>AI FEEDBACK</span>
              </div>
              <div className="whitespace-pre-wrap text-sm text-white">{problem.aiFeedback}</div>
            </div>
          )}

          {/* Solved At */}
          <div className="text-center text-xs text-gray-400" style={{ fontFamily: 'Orbitron' }}>
            SOLVED AT: {new Date(problem.solvedAt).toLocaleString('ko-KR')}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t-2 border-cyan-400 bg-slate-900/95 p-4 backdrop-blur-sm">
          <button
            onClick={() => onBookmarkToggle(problem.id, problem.isBookmarked)}
            className={`flex-1 rounded border-2 py-2 text-sm font-bold transition-colors ${
              problem.isBookmarked
                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30'
                : 'border-purple-400 bg-transparent text-purple-400 hover:bg-purple-400/20'
            }`}
            style={{ fontFamily: 'Orbitron' }}
          >
            {problem.isBookmarked ? '⭐ BOOKMARKED' : '☆ BOOKMARK'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded border-2 border-cyan-400 bg-cyan-400/20 py-2 text-sm font-bold text-cyan-400 transition-colors hover:bg-cyan-400/30"
            style={{ fontFamily: 'Orbitron' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
