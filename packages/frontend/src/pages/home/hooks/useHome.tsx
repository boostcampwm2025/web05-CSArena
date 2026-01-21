import { useCallback, useEffect, useRef, useState } from 'react';

import { handleOAuthCallback, logout } from '@/feature/auth/auth.api';
import { useUser } from '@/feature/auth/useUser';

export function useHome() {
  const { userData, setUserData, setAccessToken } = useUser();

  const [isOpenLoginModal, setIsOpenLoginModal] = useState<boolean>(false);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const res = handleOAuthCallback();

    if (!res.ok) {
      return;
    }

    setUserData({
      userId: res.userData.id,
      nickname: res.userData.nickname,
      tier: res.userData.tier,
      expPoint: res.userData.expPoint,
      isSentFeedback: false,
    });
    setAccessToken(res.accessToken ?? null);

    setIsOpenLoginModal(false);
  }, [setUserData, setAccessToken]);

  const onClickLoginBtn = useCallback(() => {
    setIsOpenLoginModal(true);
  }, []);

  const onClickMyPageBtn = useCallback(() => {}, []);

  const onClickLogoutBtn = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    await logout(controller.signal);

    setUserData(null);
    setAccessToken(null);
  }, [setUserData, setAccessToken]);

  return {
    userData,
    isOpenLoginModal,
    setIsOpenLoginModal,
    onClickLoginBtn,
    onClickMyPageBtn,
    onClickLogoutBtn,
  };
}
