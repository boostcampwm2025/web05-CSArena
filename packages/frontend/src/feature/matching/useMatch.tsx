import { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MatchEnd, MatchEnqueueRes, MatchFound } from '@/lib/socket/event';
import { getSocket } from '@/lib/socket';

import { useUser } from '@/feature/auth/useUser';

type MatchState = 'matching' | 'inGame' | 'match-end';
type OpponentInfo = {
  nickname: string;
  profileImage: string | null;
  tier: string;
  tierPoint: number;
  expPoint: number;
} | null;

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
  explanation: string;
};

type MatchResult = {
  myTotalPoints: number;
  myWinCount: number;
  opponentTotalPoints: number;
  opponentWinCount: number;
  roundResults: RoundResult[];
  myTierPointChange?: number;
  isWin?: boolean;
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

  const handleConnectCompleted = useCallback(() => {
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
    setMatchResult({
      myTotalPoints: 0,
      myWinCount: 0,
      opponentTotalPoints: 0,
      opponentWinCount: 0,
      roundResults: [],
    });
    setMatchState('inGame');
  }, []);

  const handleOpponentDisconnected = useCallback(() => {
    setMatchResult((prev) => ({
      ...prev,
      myWinCount: prev.myWinCount + 1,
    }));
  }, []);

  const handleMatchEnd = useCallback(
    (payload: MatchEnd) => {
      setMatchResult((prev) => ({
        ...prev,
        myTotalPoints: payload.finalScores.my,
        opponentTotalPoints: payload.finalScores.opponent,
        myTierPointChange: payload.tierPointChange,
        isWin: payload.isWin, // 서버에서 받은 승패 여부 저장
      }));

      // 티어포인트 업데이트
      setUserData((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          tierPoint: prev.tierPoint + payload.tierPointChange,
        };
      });

      setMatchState('match-end');
    },
    [setUserData],
  );

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect:completed', handleConnectCompleted);
    socket.on('match:found', handleMatchFound);
    socket.on('opponent:disconnected', handleOpponentDisconnected);
    socket.on('match:end', handleMatchEnd);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect:completed', handleConnectCompleted);
      socket.off('match:found', handleMatchFound);
      socket.off('opponent:disconnected', handleOpponentDisconnected);
      socket.off('match:end', handleMatchEnd);

      socket.disconnect();
    };
  }, [handleConnectCompleted, handleMatchFound, handleOpponentDisconnected, handleMatchEnd]);

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
