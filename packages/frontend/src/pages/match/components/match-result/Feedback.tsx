import { createPortal } from 'react-dom';

import { useFeedback } from '@/pages/match/hooks/useFeedback';

type FeedbackProps = {
  open: boolean;
  onClose: () => void;
};

export default function Feedback({ open, onClose }: FeedbackProps) {
  const { feedback, setFeedback, isSubmitting, isSubmit, onClickSubmitBtn } = useFeedback();

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-full max-h-[50vh] w-full max-w-[50vw] flex-col items-stretch justify-between gap-4 border-4 border-purple-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-6 shadow-2xl shadow-purple-500/30">
        {/* Close Modal Button */}
        <div className="flex w-full flex-col items-end">
          <button
            className="border-4 border-red-300 bg-gradient-to-r from-red-500 to-rose-500 px-3 py-2 text-2xl font-bold text-white shadow-lg shadow-red-500/50 transition-all duration-200 hover:scale-105 hover:from-red-400 hover:to-rose-400"
            style={{ fontFamily: 'Orbitron' }}
            onClick={onClose}
          >
            X
          </button>
        </div>

        {isSubmit ? (
          <div className="flex h-full flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                피드백 남겨주셔서 감사합니다!
              </p>
              <p className="text-base text-white/70">
                보내주신 피드백을 꼼꼼히 확인하고 개선에 반영하겠습니다. 오늘도 저희 서비스를
                이용해주셔서 감사합니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Feedback Area (Message + Feedback Input) */}
            <div className="flex h-full flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                  플레이해주셔서 감사합니다!
                </p>
                <p className="text-base text-white/70">
                  불편했던 점이나 개선 아이디어가 있다면 편하게 남겨주세요.
                </p>
              </div>

              <textarea
                className="h-full w-full resize-none rounded-lg border-2 border-purple-300/60 bg-slate-950/60 p-4 text-white shadow-inner shadow-black/40 outline-none ring-1 ring-purple-500/20 transition placeholder:text-white/40 focus:border-purple-200 focus:ring-4 focus:ring-purple-400/30"
                placeholder="예) UI가 조금 더 커졌으면 좋겠어요 / 매칭 시간이 길어요 / 버그가 있었어요 등"
                style={{ fontFamily: 'Orbitron' }}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            {/* Submit Feedback Button */}
            <button
              className="w-full border-4 border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 p-2 text-2xl font-bold text-white shadow-lg shadow-cyan-500/50 transition-all duration-200 enabled:hover:scale-105 enabled:hover:from-cyan-400 enabled:hover:to-blue-400 disabled:border-cyan-300/40 disabled:from-cyan-900/50 disabled:to-blue-900/50 disabled:text-white/70 disabled:shadow-cyan-500/20"
              style={{ fontFamily: 'Orbitron' }}
              onClick={onClickSubmitBtn}
              disabled={feedback.trim().length === 0 || isSubmitting || isSubmit}
            >
              <i className="ri-send-plane-line mr-2 text-2xl" />
              Send Feedback
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
