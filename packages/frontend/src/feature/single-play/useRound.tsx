import { createContext, useContext } from 'react';
import { useState } from 'react';

import { Question, SinglePlayPhase } from '@/pages/single-play/types/types';

type CategoryAPI = {
  selectedCategoryIds: number[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<number[]>>;
};
type PhaseAPI = {
  phase: SinglePlayPhase;
  setPhase: React.Dispatch<React.SetStateAction<SinglePlayPhase>>;
};
type QuestionAPI = {
  question: Question;
  setQuestion: React.Dispatch<React.SetStateAction<Question>>;
};
type ResultAPI = {
  submitAnswer: { answer: string; isCorrect: boolean } | undefined;
  setSubmitAnswer: React.Dispatch<
    React.SetStateAction<{ answer: string; isCorrect: boolean } | undefined>
  >;
};

const CategoryCtx = createContext<CategoryAPI | null>(null);
const PhaseCtx = createContext<PhaseAPI | null>(null);
const QuestionCtx = createContext<QuestionAPI | null>(null);
const ResultCtx = createContext<ResultAPI | null>(null);

export function SinglePlayProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [phase, setPhase] = useState<SinglePlayPhase>('preparing');
  const [question, setQuestion] = useState<Question>(undefined);
  const [submitAnswer, setSubmitAnswer] = useState<
    { answer: string; isCorrect: boolean } | undefined
  >(undefined);

  return (
    <CategoryCtx.Provider value={{ selectedCategoryIds, setSelectedCategoryIds }}>
      <PhaseCtx.Provider value={{ phase, setPhase }}>
        <QuestionCtx.Provider value={{ question, setQuestion }}>
          <ResultCtx.Provider
            value={{
              submitAnswer,
              setSubmitAnswer,
            }}
          >
            {children}
          </ResultCtx.Provider>
        </QuestionCtx.Provider>
      </PhaseCtx.Provider>
    </CategoryCtx.Provider>
  );
}

export function useCategory() {
  const ctx = useContext(CategoryCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}

export function usePhase() {
  const ctx = useContext(PhaseCtx);

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
