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
type MatchAPI = {
  matchId: number | null;
  setMatchId: React.Dispatch<React.SetStateAction<number | null>>;
};

const CategoryCtx = createContext<CategoryAPI | null>(null);
const PhaseCtx = createContext<PhaseAPI | null>(null);
const QuestionCtx = createContext<QuestionAPI | null>(null);
const MatchCtx = createContext<MatchAPI | null>(null);

export function SinglePlayProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [phase, setPhase] = useState<SinglePlayPhase>({ kind: 'preparing' });
  const [matchId, setMatchId] = useState<number | null>(null);
  const [curQuestion, setCurQuestion] = useState<Question | null>(null);

  return (
    <CategoryCtx.Provider value={{ selectedCategoryIds, setSelectedCategoryIds }}>
      <PhaseCtx.Provider value={{ phase, setPhase }}>
        <MatchCtx.Provider value={{ matchId, setMatchId }}>
          <QuestionCtx.Provider value={{ curQuestion, setCurQuestion }}>
            {children}
          </QuestionCtx.Provider>
        </MatchCtx.Provider>
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

export function useMatchId() {
  const ctx = useContext(MatchCtx);

  if (!ctx) {
    throw new Error('useMatchId must be used within SinglePlayProvider');
  }

  return ctx;
}
