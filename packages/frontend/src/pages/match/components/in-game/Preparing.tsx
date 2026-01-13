import { useRoundTick } from '@/feature/matching/useRound';

export default function Preparing() {
  const { remainedSec } = useRoundTick();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <div
            className="animate-pulse bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-8xl font-black text-transparent"
            style={{ fontFamily: 'Press Start 2P' }}
          >
            {remainedSec}
          </div>
        </div>
        <div
          className="animate-pulse text-2xl font-bold text-cyan-300"
          style={{ fontFamily: 'Orbitron' }}
        >
          GET READY!
        </div>
      </div>
    </div>
  );
}
