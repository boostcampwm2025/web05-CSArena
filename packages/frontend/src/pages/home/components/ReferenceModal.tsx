import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = { onClose: () => void };

export default function ReferenceModal({ onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={onClose}
    >
      <div
        className="relative flex w-full max-w-[50vw] flex-col items-stretch gap-4 border-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-6 shadow-2xl shadow-cyan-500/30"
        onMouseDown={(e) => e.stopPropagation()}
      >
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
          REFERENCES
        </h2>

        {/* Book Cards */}
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-4 border-2 border-cyan-500/50 bg-slate-800/50 p-4">
            <i className="ri-book-2-line mt-1 text-3xl text-cyan-400" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
                Computer Networks: A Systems Approach
              </h3>
              <p className="text-sm text-slate-300">Release 6.1</p>
              <p className="text-sm text-slate-400">Larry Peterson, Bruce Davie</p>
              <p className="text-sm text-slate-500">2019</p>
            </div>
          </div>

          <div className="flex items-start gap-4 border-2 border-purple-500/50 bg-slate-800/50 p-4">
            <i className="ri-book-2-line mt-1 text-3xl text-purple-400" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-purple-300" style={{ fontFamily: 'Orbitron' }}>
                Database Design - 2nd Edition
              </h3>
              <p className="text-sm text-slate-300">Adrienne Watt, Nelson Eng</p>
              <p className="text-sm text-slate-500">BCcampus</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
