import { useState } from 'react';

import { useScene } from '@/feature/useScene.tsx';

export default function Home() {
  const { setScene } = useScene();

  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const onClickQuickStartBtn = () => {
    if (isDisabled) {
      return;
    }

    setIsDisabled(true);
    setScene('match');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Retro grid background */}
      <div className="absolute inset-1 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
                        linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
                    `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-8">
          <img
            src="https://public.readdy.ai/ai/img_res/378e90fc-2221-4174-a79f-11e83e0a3814.png"
            alt="CS Battle Logo"
            className="h-32 w-32 drop-shadow-2xl"
          />
          {/* Title */}
          <div className="flex flex-col items-center justify-center text-center">
            <h1
              className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-5xl font-black text-transparent"
              style={{ fontFamily: '"Press Start 2P"' }}
            >
              CS BATTLE
            </h1>
            <p
              className="text-base tracking-widest text-cyan-300"
              style={{ fontFamily: 'Orbitron' }}
            >
              KNOWLEDGE ARENA
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-3xl flex-col gap-4">
          {/* Login Button */}
          <button
            onClick={() => {}}
            className="border-4 border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 py-4 text-2xl font-bold text-white shadow-lg shadow-cyan-500/50 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-blue-400"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-login-box-line mr-3 text-xl" />
            LOGIN
          </button>

          {/* Quick Start Button */}
          <button
            onClick={onClickQuickStartBtn}
            disabled={isDisabled}
            className="disabled:none border-4 border-pink-300 bg-gradient-to-r from-pink-500 to-rose-500 py-4 text-2xl font-bold text-white shadow-lg shadow-pink-500/50 transition-all duration-200 enabled:hover:scale-105 enabled:hover:from-pink-400 enabled:hover:to-rose-400 disabled:border-pink-300/40 disabled:from-pink-900/50 disabled:to-rose-900/50 disabled:text-white/70 disabled:shadow-pink-500/20"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-sword-line mr-3 text-2xl" />
            QUICK START (ONLINE MATCH)
          </button>

          {/* Self Study Button */}
          <button
            onClick={() => {}}
            className="border-4 border-purple-300 bg-gradient-to-r from-purple-500 to-indigo-500 py-4 text-2xl font-bold text-white shadow-lg shadow-purple-500/50 transition-all duration-200 hover:scale-105 hover:from-purple-400 hover:to-indigo-400"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-book-open-line mr-3 text-2xl" />
            SELF STUDY (SINGLE MODE)
          </button>

          {/* Bottom Navigation Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {}}
              className="border-4 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-2xl font-bold text-white shadow-lg shadow-amber-500/50 transition-all duration-200 hover:scale-105 hover:from-amber-400 hover:to-orange-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <i className="ri-trophy-line mr-2 text-lg" />
              LEADERBOARD
            </button>
            <button
              onClick={() => {}}
              className="border-4 border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-2xl font-bold text-white shadow-lg shadow-emerald-500/50 transition-all duration-200 hover:scale-105 hover:from-emerald-400 hover:to-teal-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <i className="ri-database-2-line mr-2 text-lg" />
              PROBLEM BANK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
