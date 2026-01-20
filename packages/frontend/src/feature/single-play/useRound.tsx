import React, { createContext, useContext } from 'react';
import { useState } from 'react';

type Difficulty = 'easy' | 'medium' | 'hard';
type MultipleChoiceOptions = { A: string; B: string; C: string; D: string };
type Question =
  | {
      id: number;
      type: 'multiple_choice';
      qustion: string;
      difficulty: Difficulty;
      category: string[];
      options: MultipleChoiceOptions;
      answer: 'A' | 'B' | 'C' | 'D';
    }
  | {
      id: number;
      type: 'short_answer';
      question: string;
      difficulty: Difficulty;
      category: string[];
      answer: string;
    }
  | {
      id: number;
      type: 'essay';
      question: string;
      difficulty: Difficulty;
      category: string[];
      sampleAnswer: string;
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
  submitAnswers: string[];
  setSubmitAnswers: React.Dispatch<React.SetStateAction<string[]>>;
  correctCnt: number;
  setCorrectCnt: React.Dispatch<React.SetStateAction<number>>;
  totalPoints: number;
  setTotalPoints: React.Dispatch<React.SetStateAction<number>>;
};

const RoundCtx = createContext<RoundAPI | null>(null);
const QuestionCtx = createContext<QuestionAPI | null>(null);
const ResultCtx = createContext<ResultAPI | null>(null);

export function SinglePlayProvider({ children }: { children: React.ReactNode }) {
  const [curRound, setCurRound] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submitAnswers, setSubmitAnswers] = useState<string[]>([]);
  const [correctCnt, setCorrectCnt] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  return (
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
  );
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
