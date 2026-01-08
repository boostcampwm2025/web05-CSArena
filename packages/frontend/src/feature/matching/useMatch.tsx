import { createContext, useContext } from 'react';
import { useState } from 'react';

type MatchState = 'matching' | 'inGame';
type MatchAPI = {
  matchState: MatchState;
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
};

const MatchCtx = createContext<MatchAPI | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [matchState, setMatchState] = useState<MatchState>('matching');

  return <MatchCtx.Provider value={{ matchState, setMatchState }}>{children}</MatchCtx.Provider>;
}

export function useMatch() {
  const ctx = useContext(MatchCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
