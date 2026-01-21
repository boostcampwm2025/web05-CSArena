import { useUser } from '@/feature/auth/useUser';
import { useCallback } from 'react';

export function useHome() {
  const { userData } = useUser();

  const onClickMyPageBtn = useCallback(() => {}, []);

  const onClickLogoutBtn = useCallback(() => {}, []);

  return { userData, onClickMyPageBtn, onClickLogoutBtn };
}
