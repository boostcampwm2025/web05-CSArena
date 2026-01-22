import { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MatchEnd, MatchEnqueueRes, MatchFound } from '@/lib/socket/event';
import { getSocket } from '@/lib/socket';

import { useUser } from '@/feature/auth/useUser';

type MatchState = 'matching' | 'inGame' | 'match-end';
type OpponentInfo = { nickname: string; tier: string; expPoint: number } | null;

type QuestionContent =
  | { type: 'multiple'; question: string; option: string[] }
  | { type: 'short'; question: string }
  | { type: 'essay'; question: string }
  | null;

type RoundResult = {
  index: number;
  question: {
    category: string[];
    point: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    content: QuestionContent;
  };
  myAnswer: string;
  opponentAnswer: string;
  bestAnswer: string;
};

type MatchResult = {
  myTotalPoints: number;
  myWinCount: number;
  opponentTotalPoints: number;
  opponentWinCount: number;
  roundResults: RoundResult[];
};

type MatchAPI = {
  matchState: MatchState;
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
  opponentInfo: OpponentInfo;
  matchResult: MatchResult;
  setMatchResult: React.Dispatch<React.SetStateAction<MatchResult>>;
};

const MatchCtx = createContext<MatchAPI | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setUserData } = useUser();
  const [matchState, setMatchState] = useState<MatchState>('matching');
  const [opponentInfo, setOpponentInfo] = useState<OpponentInfo>(null);
  const [matchResult, setMatchResult] = useState<MatchResult>({
    myTotalPoints: 0,
    myWinCount: 0,
    opponentTotalPoints: 0,
    opponentWinCount: 0,
    roundResults: [],
  });

  const socketRef = useRef(getSocket(accessToken));

  const handleUserInfo = useCallback(
    (payload: { nickname: string | undefined; tier: string; exp_point: number }) => {
      setUserData((prev) => {
        if (!prev) {
          return prev;
        }

        return { ...prev, tier: payload.tier, expPoint: payload.exp_point };
      });

      const socket = socketRef.current;

      socket.emit('match:enqueue', undefined, (ack: MatchEnqueueRes) => {
        if (!ack.ok) {
          // TODO: 소켓 연결 실패 시 메인 화면으로 돌아가거나 자동 재연결 등 에러 헨들링 로직 추가

          return;
        }
      });
    },
    [setUserData],
  );

  const handleMatchFound = useCallback((payload: MatchFound) => {
    setOpponentInfo(payload.opponent);
    setMatchResult({
      myTotalPoints: 0,
      myWinCount: 0,
      opponentTotalPoints: 0,
      opponentWinCount: 0,
      roundResults: [],
    });
    setMatchState('inGame');
  }, []);

  const handleMatchEnd = useCallback((payload: MatchEnd) => {
    setMatchResult((prev) => ({
      ...prev,
      myTotalPoints: payload.finalScores.my,
      opponentTotalPoints: payload.finalScores.opponent,
    }));

    setMatchState('match-end');
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('user:info', handleUserInfo);
    socket.on('match:found', handleMatchFound);
    socket.on('match:end', handleMatchEnd);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('user:info', handleUserInfo);
      socket.off('match:found', handleMatchFound);
      socket.off('match:end', handleMatchEnd);

      socket.disconnect();
    };
  }, [handleUserInfo, handleMatchFound, handleMatchEnd]);

  return (
    <MatchCtx.Provider
      value={{ matchState, setMatchState, opponentInfo, matchResult, setMatchResult }}
    >
      {children}
    </MatchCtx.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
