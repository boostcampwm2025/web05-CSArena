import { createContext, useContext } from 'react';
import { useState } from 'react';

type UserData = {
  userId: string;
  nickname: string;
  tier: string;
  tierPoint: number;
  expPoint: number;
  isSentFeedback: boolean;
} | null;

type UserAPI = {
  // 사용자 데이터
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;

  // Access Token
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
};

const UserCtx = createContext<UserAPI | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  return (
    <UserCtx.Provider value={{ userData, setUserData, accessToken, setAccessToken }}>
      {children}
    </UserCtx.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserCtx);

  if (!ctx) {
    throw new Error();
  }

  return ctx;
}
