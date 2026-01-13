import { useEffect, useState } from 'react';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function Matching() {
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center justify-center gap-8">
        {/* Logo */}
        <img
          src="https://public.readdy.ai/ai/img_res/378e90fc-2221-4174-a79f-11e83e0a3814.png"
          alt="CS Battle Logo"
          className="h-32 w-32 drop-shadow-2xl"
        />

        {/* Title */}
        <div className="flex flex-col items-center justify-center text-center">
          <h1
            className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-3xl font-black text-transparent"
            style={{ fontFamily: '"Press Start 2P"' }}
          >
            CS BATTLE
          </h1>
        </div>

        {/* Rotating Animation */}
        <div className="relative h-48 w-48">
          {/* Outer Rotating circles */}
          <svg
            className="absolute inset-0 animate-spin"
            viewBox="0 0 100 100"
            style={{ animationDuration: '3s' }}
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              className="stroke-cyan-400"
              stroke-width="2"
              stroke-linecap="round"
              stroke-dasharray="197.92 65.97"
            />
          </svg>

          {/* Middle Rotating circles */}
          <svg
            className="absolute inset-4 animate-spin"
            viewBox="0 0 100 100"
            style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              className="stroke-pink-400"
              stroke-width="2"
              stroke-linecap="round"
              stroke-dasharray="197.92 65.97"
            />
          </svg>

          {/* Inner Rotating circles */}
          <svg
            className="absolute inset-8 animate-spin"
            viewBox="0 0 100 100"
            style={{ animationDuration: '1.5s' }}
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              className="stroke-purple-400"
              stroke-width="2"
              stroke-linecap="round"
              stroke-dasharray="197.92 65.97"
            />
          </svg>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="ri-search-line animate-pulse text-6xl text-cyan-300"></i>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <p
            className="animate-pulse text-2xl font-bold text-cyan-300"
            style={{ fontFamily: 'Orbitron' }}
          >
            SEARCHING FOR OPPONENT...
          </p>
          <p className="text-base text-purple-300" style={{ fontFamily: 'Orbitron' }}>
            Finding a worthy challenger
          </p>
        </div>

        {/* Timer */}
        <div className="border-4 border-cyan-400 bg-gradient-to-r from-slate-800/90 to-slate-900/90 px-8 py-4 shadow-2xl shadow-cyan-500/30">
          <div className="text-center">
            <div className="text-xs text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
              ELAPSED TIME
            </div>
            <div className="text-3xl font-bold text-pink-400" style={{ fontFamily: 'Orbitron' }}>
              {formatTime(time)}
            </div>
          </div>
        </div>

        {/* Loading dots */}
        <div className="mt-6 flex space-x-2">
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-cyan-400"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-purple-400"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-pink-400"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
