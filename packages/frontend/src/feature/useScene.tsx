import { createContext, useContext } from 'react';
import { useState } from 'react';

type Scene = 'home' | 'match' | 'single-play' | 'problem-bank' | 'my-page' | 'leaderboard';
type SceneAPI = { scene: Scene; setScene: React.Dispatch<React.SetStateAction<Scene>> };

const SceneCtx = createContext<SceneAPI | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  const [scene, setScene] = useState<Scene>('home');

  return <SceneCtx.Provider value={{ scene, setScene }}>{children}</SceneCtx.Provider>;
}

export function useScene() {
  const ctx = useContext(SceneCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
