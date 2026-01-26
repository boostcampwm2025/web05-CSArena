import { createContext, useContext } from 'react';
import { useState } from 'react';

import { SinglePlayPhase } from '@/pages/single-play/types/types';

type CategoryAPI = {
  selectedCategoryIds: number[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<number[]>>;
};
type PhaseAPI = {
  phase: SinglePlayPhase;
  setPhase: React.Dispatch<React.SetStateAction<SinglePlayPhase>>;
};

const CategoryCtx = createContext<CategoryAPI | null>(null);
const PhaseCtx = createContext<PhaseAPI | null>(null);

export function SinglePlayProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [phase, setPhase] = useState<SinglePlayPhase>({ kind: 'preparing' });

  return (
    <CategoryCtx.Provider value={{ selectedCategoryIds, setSelectedCategoryIds }}>
      <PhaseCtx.Provider value={{ phase, setPhase }}>{children}</PhaseCtx.Provider>
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
