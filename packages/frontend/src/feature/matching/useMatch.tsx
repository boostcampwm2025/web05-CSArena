import { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MatchEnqueueRes, MatchFound } from '@/lib/socket/event';
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

  const handleConnect = useCallback(() => {
    const socket = socketRef.current;

    socket.emit('match:enqueue', undefined, (ack: MatchEnqueueRes) => {
      if (!ack.ok) {
        // TODO: 소켓 연결 실패 시 메인 화면으로 돌아가거나 자동 재연결 등 에러 헨들링 로직 추가
        return;
      }
    });
  }, []);

  const handleMatchFound = useCallback((payload: MatchFound) => {
    setOpponentInfo(payload.opponent);
    setMatchState('inGame');
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect', handleConnect);
    socket.on('match:found', handleMatchFound);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('match:found', handleMatchFound);

      socket.disconnect();
    };
  }, [handleConnect, handleMatchFound]);

  return <MatchCtx.Provider value={{ matchState, opponentInfo }}>{children}</MatchCtx.Provider>;
}

export function useMatch() {
  const ctx = useContext(MatchCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
