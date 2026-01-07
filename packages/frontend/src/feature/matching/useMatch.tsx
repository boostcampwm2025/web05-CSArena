import { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MatchFound } from '@/lib/socket/event';
import { getSocket } from '@/lib/socket';

type MatchState = 'matching' | 'inGame';
type OpponentInfo = { nickname: string; tier: string; expPoint: number } | null;

type MatchAPI = {
  matchState: MatchState;
  opponentInfo: OpponentInfo;
};

const MatchCtx = createContext<MatchAPI | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [matchState, setMatchState] = useState<MatchState>('matching');
  const [opponentInfo, setOpponentInfo] = useState<OpponentInfo>(null);

  const socketRef = useRef(getSocket());

  const handleMatchFound = useCallback((payload: MatchFound) => {
    setOpponentInfo(payload.opponent);
    setMatchState('inGame');
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('match:found', handleMatchFound);

    return () => {
      socket.off('match:found', handleMatchFound);
    };
  }, [handleMatchFound]);

  return <MatchCtx.Provider value={{ matchState, opponentInfo }}>{children}</MatchCtx.Provider>;
}

export function useMatch() {
  const ctx = useContext(MatchCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
