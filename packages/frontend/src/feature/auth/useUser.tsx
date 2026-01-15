import { createContext, useContext } from 'react';
import { useState } from 'react';

type UserData = {
  userId: string;
  nickname: string;
  tier: string;
  expPoint: number;
  isSentFeedback: boolean;
} | null;
type UserAPI = {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
};

const UserCtx = createContext<UserAPI | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);

  return <UserCtx.Provider value={{ userData, setUserData }}>{children}</UserCtx.Provider>;
}

export function useUser() {
  const ctx = useContext(UserCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
