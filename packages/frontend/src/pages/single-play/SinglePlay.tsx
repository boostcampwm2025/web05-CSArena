import { QuestionProvider, usePhase } from '@/feature/single-play/useRound';

import TopBar from './components/Topbar';
import Preparing from './components/Preparing';
import Playing from './components/Playing';
import RoundResult from './components/RoundResult';

export default function SinglePlay() {
  const { phase } = usePhase();

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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

      <div className="relative z-10 shrink-0">
        <TopBar />
      </div>

      <div className="relative z-10 min-h-0 flex-1">
        <QuestionProvider>
          {phase.kind === 'preparing' && <Preparing />}
          {phase.kind === 'playing' && <Playing />}
          {phase.kind === 'result' && <RoundResult />}
        </QuestionProvider>
      </div>
    </div>
  );
}
