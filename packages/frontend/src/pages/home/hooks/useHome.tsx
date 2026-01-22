import { useCallback, useEffect, useRef, useState } from 'react';

import { handleOAuthCallback, logout } from '@/feature/auth/auth.api';

import { useUser } from '@/feature/auth/useUser';
import { useScene } from '@/feature/useScene';

export function useHome() {
  const { userData, setUserData, setAccessToken } = useUser();
  const { setScene } = useScene();

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

  const onClickQuickStartBtn = useCallback(() => {
    if (!userData) {
      setIsOpenLoginModal(true);

      return;
    }

    setScene('match');
  }, [userData, setScene]);

  const onClickSelfStudyBtn = useCallback(() => {
    if (!userData) {
      setIsOpenLoginModal(true);

      return;
    }

    setScene('single-play');
    // TODO: 싱글 모드 로직이 병합되면 추가할 예정
  }, [userData, setScene]);

  const onClickProblemBankBtn = useCallback(() => {
    if (!userData) {
      setIsOpenLoginModal(true);

      return;
    }

    setScene('problem-bank');
  }, [userData, setScene]);

  return {
    userData,
    isOpenLoginModal,
    setIsOpenLoginModal,
    onClickLoginBtn,
    onClickMyPageBtn,
    onClickLogoutBtn,
    onClickQuickStartBtn,
    onClickSelfStudyBtn,
    onClickProblemBankBtn,
  };
}
