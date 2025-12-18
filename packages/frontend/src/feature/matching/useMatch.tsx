import { createContext, useContext } from 'react';
import { useEffect, useState } from 'react';

type MatchState = 'matching' | 'inGame';
type MatchAPI = {
  matchState: MatchState;
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
};

const MatchCtx = createContext<MatchAPI | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [matchState, setMatchState] = useState<MatchState>('matching');

  useEffect(() => {
    // TODO: 마운트 시 소켓 연결
    // socket.connect();

    // TODO: 언마운트 시 소켓 정리
    return () => {
      // socket.disconnect();
    };
  }, []);

  return <MatchCtx.Provider value={{ matchState, setMatchState }}>{children}</MatchCtx.Provider>;
}

export function useMatch() {
  const ctx = useContext(MatchCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
