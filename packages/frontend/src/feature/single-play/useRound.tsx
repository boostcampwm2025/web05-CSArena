import { createContext, useContext } from 'react';
import { useState } from 'react';

import { Question, SinglePlayPhase } from '@/pages/single-play/types/types';

type PhaseAPI = {
  phase: SinglePlayPhase;
  setPhase: React.Dispatch<React.SetStateAction<SinglePlayPhase>>;
};
type RoundAPI = {
  curRound: number;
  setCurRound: React.Dispatch<React.SetStateAction<number>>;
  totalRounds: number;
  setTotalRounds: React.Dispatch<React.SetStateAction<number>>;
};
type QuestionAPI = {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
};
type ResultAPI = {
  submitAnswers: { answer: string; isCorrect: boolean }[];
  setSubmitAnswers: React.Dispatch<React.SetStateAction<{ answer: string; isCorrect: boolean }[]>>;
  correctCnt: number;
  setCorrectCnt: React.Dispatch<React.SetStateAction<number>>;
  totalPoints: number;
  setTotalPoints: React.Dispatch<React.SetStateAction<number>>;
};

const PhaseCtx = createContext<PhaseAPI | null>(null);
const RoundCtx = createContext<RoundAPI | null>(null);
const QuestionCtx = createContext<QuestionAPI | null>(null);
const ResultCtx = createContext<ResultAPI | null>(null);

export function SinglePlayProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<SinglePlayPhase>('preparing');
  const [curRound, setCurRound] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submitAnswers, setSubmitAnswers] = useState<{ answer: string; isCorrect: boolean }[]>([]);
  const [correctCnt, setCorrectCnt] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  return (
    <PhaseCtx.Provider value={{ phase, setPhase }}>
      <RoundCtx.Provider
        value={{
          curRound,
          setCurRound,
          totalRounds,
          setTotalRounds,
        }}
      >
        <QuestionCtx.Provider value={{ questions, setQuestions }}>
          <ResultCtx.Provider
            value={{
              submitAnswers,
              setSubmitAnswers,
              correctCnt,
              setCorrectCnt,
              totalPoints,
              setTotalPoints,
            }}
          >
            {children}
          </ResultCtx.Provider>
        </QuestionCtx.Provider>
      </RoundCtx.Provider>
    </PhaseCtx.Provider>
  );
}

export function usePhase() {
  const ctx = useContext(PhaseCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}

export function useRound() {
  const ctx = useContext(RoundCtx);

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

export function useResult() {
  const ctx = useContext(ResultCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
