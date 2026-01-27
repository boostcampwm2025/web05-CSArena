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
  curQuestion: Question | null;
  setCurQuestion: React.Dispatch<React.SetStateAction<Question | null>>;
};

const CategoryCtx = createContext<CategoryAPI | null>(null);
const PhaseCtx = createContext<PhaseAPI | null>(null);
const QuestionCtx = createContext<QuestionAPI | null>(null);

export function SinglePlayProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [phase, setPhase] = useState<SinglePlayPhase>({ kind: 'preparing' });

  return (
    <CategoryCtx.Provider value={{ selectedCategoryIds, setSelectedCategoryIds }}>
      <PhaseCtx.Provider value={{ phase, setPhase }}>{children}</PhaseCtx.Provider>
    </CategoryCtx.Provider>
  );
}

export function QuestionProvider({ children }: { children: React.ReactNode }) {
  const [curQuestion, setCurQuestion] = useState<Question | null>(null);

  return (
    <QuestionCtx.Provider value={{ curQuestion, setCurQuestion }}>{children}</QuestionCtx.Provider>
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
