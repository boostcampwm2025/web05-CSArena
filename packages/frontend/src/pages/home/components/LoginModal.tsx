import { createPortal } from 'react-dom';

import { useLoginModal } from '@/pages/home/hooks/useLoginModal';

type Props = { onClose: () => void };

export default function LoginModal({ onClose }: Props) {
  const { onClickLoginWithGithubBtn } = useLoginModal();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex h-full max-h-[30vh] w-full max-w-[40vw] flex-col items-stretch gap-4 border-4 border-purple-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-6 shadow-2xl shadow-purple-500/30">
        {/* Close Modal Button */}
        <button
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border-4 border-red-300 bg-gradient-to-r from-red-500 to-rose-500 px-3 py-2 text-2xl font-bold text-white shadow-lg shadow-red-500/50 transition-all duration-200 hover:scale-105 hover:from-red-400 hover:to-rose-400"
          style={{ fontFamily: 'Orbitron' }}
          onClick={onClose}
        >
          <i className="ri-close-line text-3xl" />
        </button>

        {/* Title */}
        <h2
          className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-center text-3xl font-black text-transparent"
          style={{ fontFamily: 'Orbitron' }}
        >
          LOGIN
        </h2>

        {/* OAuth Buttons */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <button
            className="flex w-full items-center justify-center border-4 border-gray-700 bg-gray-900 px-6 py-4 font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-gray-800"
            style={{ fontFamily: 'Orbitron' }}
            onClick={onClickLoginWithGithubBtn}
          >
            <i className="ri-github-fill mr-3 text-2xl" />
            Continue with Github
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
