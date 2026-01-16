import { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getSocket } from '@/lib/socket';
import { RoundEnd, RoundReady, RoundStart, RoundTick } from '@/lib/socket/event';

import { useMatch } from './useMatch';

type RoundState = 'preparing' | 'playing' | 'round-result';
type QuestionContent =
  | { type: 'multiple'; question: string; option: string[] }
  | { type: 'short'; question: string }
  | { type: 'essay'; question: string }
  | null;

type RoundPhaseAPI = {
  roundState: RoundState;
  roundIndex: number;
  totalRounds: number;
};

type RoundTickAPI = {
  remainedSec: number;
};

type QuestionAPI = {
  category: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  point: number;
  content: QuestionContent;
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
  bestAnswer: string;
  explanation: string;
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
  const [category, setCategory] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [point, setPoint] = useState<number>(0);
  const [content, setContent] = useState<QuestionContent>(null);
  const [myAnswer, setMyAnswer] = useState<string>('');
  const [myDelta, setMyDelta] = useState<number>(0);
  const [myTotal, setMyTotal] = useState<number>(0);
  const [myIsCorrect, setMyIsCorrect] = useState<boolean>(false);
  const [opponentAnswer, setOpponentAnswer] = useState<string>('');
  const [opponentDelta, setOpponentDelta] = useState<number>(0);
  const [opponentTotal, setOpponentTotal] = useState<number>(0);
  const [opponentIsCorrect, setOpponentIsCorrect] = useState<boolean>(false);
  const [bestAnswer, setBestAnswer] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');

  const { setMatchResult } = useMatch();

  const socketRef = useRef(getSocket());

  const handleRoundReady = useCallback((payload: RoundReady) => {
    setRoundState('preparing');
    setRemainedSec(payload.durationSec);
    setRoundIndex(payload.roundIndex + 1);
    setTotalRounds(payload.totalRounds);
  }, []);

  const handleRoundStart = useCallback(
    (payload: RoundStart) => {
      setRoundState('playing');
      setRemainedSec(payload.durationSec);
      setCategory(payload.question.category);
      setDifficulty(payload.question.difficulty);
      setPoint(payload.question.point);
      setContent(payload.question.content);

      setMatchResult((prev) => ({
        ...prev,
        roundResults: [
          ...prev.roundResults,
          {
            index: roundIndex,
            question: payload.question,
            myAnswer: '',
            opponentAnswer: '',
            bestAnswer: '',
          },
        ],
      }));
    },
    [roundIndex, setMatchResult],
  );

  const handleRoundEnd = useCallback(
    (payload: RoundEnd) => {
      setRoundState('round-result');
      setRemainedSec(payload.durationSec);
      setMyAnswer(payload.results.my.submitted);
      setMyDelta(payload.results.my.delta);
      setMyTotal(payload.results.my.total);
      setMyIsCorrect(payload.results.my.correct);
      setOpponentAnswer(payload.results.opponent.submitted);
      setOpponentDelta(payload.results.opponent.delta);
      setOpponentTotal(payload.results.opponent.total);
      setOpponentIsCorrect(payload.results.opponent.correct);
      setBestAnswer(payload.solution.bestAnswer);
      setExplanation(payload.solution.explanation);

      setMatchResult((prev) => {
        const roundResult = prev.roundResults.pop();

        if (!roundResult) {
          return prev;
        }

        roundResult.myAnswer = payload.results.my.submitted;
        roundResult.opponentAnswer = payload.results.opponent.submitted;
        roundResult.bestAnswer = payload.solution.bestAnswer;

        return {
          myTotalPoints: payload.results.my.total,
          myWinCount: payload.results.my.correct ? prev.myWinCount + 1 : prev.myWinCount,
          opponentTotalPoints: payload.results.opponent.total,
          opponentWinCount: payload.results.opponent.correct
            ? prev.opponentWinCount + 1
            : prev.opponentWinCount,
          roundResults: [...prev.roundResults, roundResult],
        };
      });
    },
    [setMatchResult],
  );

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
        <QuestionCtx.Provider value={{ category, difficulty, content, point }}>
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
              bestAnswer,
              explanation,
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
