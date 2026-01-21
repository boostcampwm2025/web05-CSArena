import { useState } from 'react';

import { useScene } from '@/feature/useScene.tsx';
import { useHome } from './hooks/useHome';

export default function Home() {
  const { userData, onClickMyPageBtn, onClickLogoutBtn } = useHome();
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
          {userData ? (
            <>
              <div className="flex flex-col items-stretch gap-6 border-4 border-cyan-400 bg-gradient-to-r from-slate-800/90 to-slate-900/90 p-4">
                {/* User Info */}
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-white bg-gradient-to-br from-cyan-400 to-purple-500">
                    <i className="ri-user-star-line text-4xl text-white" />
                  </div>
                  <div className="flex flex-col justify-between p-1">
                    <h2
                      className="text-2xl font-bold text-cyan-300"
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {userData.nickname}
                    </h2>
                    <div className="flex gap-4">
                      <span
                        className="text-base font-bold text-amber-400"
                        style={{ fontFamily: 'Orbitron' }}
                      >
                        <i className="ri-vip-crown-line mr-1" />
                        {userData.tier}
                      </span>
                      <span
                        className="text-base font-bold text-pink-400"
                        style={{ fontFamily: 'Orbitron' }}
                      >
                        LV.42
                      </span>
                    </div>
                  </div>
                </div>

                {/* Experience Bar */}
                <div className="flex flex-col gap-1">
                  <div
                    className="flex justify-between text-xs text-cyan-300"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    <span>EXP</span>
                    <span>{userData.expPoint} / 10000</span>
                  </div>

                  <div className="relative h-5 w-full overflow-hidden border-2 border-cyan-500 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
                      style={{ width: `${userData.expPoint / 100}%` }}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {Math.round(userData.expPoint / 100)}%
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-stretch gap-4">
                  <button
                    className="w-full border-2 border-indigo-300 bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-xl font-bold text-white transition-all duration-200 hover:scale-105 hover:from-indigo-400 hover:to-purple-400"
                    onClick={onClickMyPageBtn}
                  >
                    <i className="ri-user-settings-line mr-2"></i>
                    MY PAGE
                  </button>
                  <button
                    className="w-full border-2 border-red-300 bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2 text-xl font-bold text-white transition-all duration-200 hover:scale-105 hover:from-red-400 hover:to-rose-400"
                    onClick={onClickLogoutBtn}
                  >
                    <i className="ri-user-settings-line mr-2"></i>
                    LOGOUT
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Login Button */}
              <button
                onClick={() => {}}
                className="border-4 border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 py-4 text-2xl font-bold text-white shadow-lg shadow-cyan-500/50 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-blue-400"
                style={{ fontFamily: 'Orbitron' }}
              >
                <i className="ri-login-box-line mr-3 text-xl" />
                LOGIN
              </button>
            </>
          )}

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
              onClick={() => setScene('problem-bank')}
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
