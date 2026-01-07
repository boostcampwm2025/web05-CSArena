import { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getSocket } from '@/lib/socket';
import { RoundEnd, RoundReady, RoundStart, RoundTick } from '@/lib/socket/event';

type RoundState = 'preparing' | 'playing' | 'round-result';
type Question = { topic: string; difficulty: string; type: string; content: string } | null;

type RoundPhaseAPI = {
  roundState: RoundState;
  roundIndex: number;
  totalRounds: number;
};

type RoundTickAPI = {
  remainedSec: number;
};

type QuestionAPI = {
  question: Question;
};

type RoundScoreAPI = {
  myAnswer: string;
  myDelta: number;
  myTotal: number;
  myIsCorrect: boolean;
  opponentAnswer: string;
  opponentDelta: number;
  opponentTotal: number;
  opponentIsCorrect: boolean;
};

const RoundPhaseCtx = createContext<RoundPhaseAPI | null>(null);
const RoundTickCtx = createContext<RoundTickAPI | null>(null);
const QuestionCtx = createContext<QuestionAPI | null>(null);
const RoundScoreCtx = createContext<RoundScoreAPI | null>(null);

export function RoundProvider({ children }: { children: React.ReactNode }) {
  const [roundState, setRoundState] = useState<RoundState>('preparing');
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [remainedSec, setRemainedSec] = useState<number>(0);
  const [question, setQuestion] = useState<Question>(null);
  const [myAnswer, setMyAnswer] = useState<string>('');
  const [myDelta, setMyDelta] = useState<number>(0);
  const [myTotal, setMyTotal] = useState<number>(0);
  const [myIsCorrect, setMyIsCorrect] = useState<boolean>(false);
  const [opponentAnswer, setOpponentAnswer] = useState<string>('');
  const [opponentDelta, setOpponentDelta] = useState<number>(0);
  const [opponentTotal, setOpponentTotal] = useState<number>(0);
  const [opponentIsCorrect, setOpponentIsCorrect] = useState<boolean>(false);

  const socketRef = useRef(getSocket());

  const handleRoundReady = useCallback((payload: RoundReady) => {
    setRoundState('preparing');
    setRemainedSec(payload.durationSec);
    setRoundIndex(payload.roundIndex);
    setTotalRounds(payload.totalRounds);
  }, []);

  const handleRoundStart = useCallback((payload: RoundStart) => {
    setRoundState('playing');
    setRemainedSec(payload.durationSec);
    setQuestion(payload.question);
  }, []);

  const handleRoundEnd = useCallback((payload: RoundEnd) => {
    setRoundState('round-result');
    setRemainedSec(payload.durationSec);
    setMyAnswer(payload.result.my.submitted);
    setMyDelta(payload.result.my.delta);
    setMyTotal(payload.result.my.total);
    setMyIsCorrect(payload.result.my.correct);
    setOpponentAnswer(payload.result.opponent.submitted);
    setOpponentDelta(payload.result.opponent.delta);
    setOpponentTotal(payload.result.opponent.total);
    setOpponentIsCorrect(payload.result.opponent.correct);
  }, []);

  const handleRoundTick = useCallback((payload: RoundTick) => {
    setRemainedSec(payload.remainedSec);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('round:ready', handleRoundReady);
    socket.on('round:start', handleRoundStart);
    socket.on('round:end', handleRoundEnd);
    socket.on('round:tick', handleRoundTick);

    return () => {
      socket.off('round:ready', handleRoundReady);
      socket.off('round:start', handleRoundStart);
      socket.off('round:end', handleRoundEnd);
      socket.off('round:tick', handleRoundTick);
    };
  }, [handleRoundReady, handleRoundStart, handleRoundEnd, handleRoundTick]);

  return (
    <RoundPhaseCtx.Provider
      value={{
        roundState,
        roundIndex,
        totalRounds,
      }}
    >
      <RoundTickCtx.Provider value={{ remainedSec }}>
        <QuestionCtx.Provider value={{ question }}>
          <RoundScoreCtx.Provider
            value={{
              myAnswer,
              myDelta,
              myTotal,
              myIsCorrect,
              opponentAnswer,
              opponentDelta,
              opponentTotal,
              opponentIsCorrect,
            }}
          >
            {children}
          </RoundScoreCtx.Provider>
        </QuestionCtx.Provider>
      </RoundTickCtx.Provider>
    </RoundPhaseCtx.Provider>
  );
}

export function useRoundPhase() {
  const ctx = useContext(RoundPhaseCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}

export function useRoundTick() {
  const ctx = useContext(RoundTickCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}

export function useQuestion() {
  const ctx = useContext(QuestionCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}

export function useRoundScore() {
  const ctx = useContext(RoundScoreCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
