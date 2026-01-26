import { useCallback, useEffect, useRef, useState } from 'react';

import { logout } from '@/feature/auth/auth.api';

import { useUser } from '@/feature/auth/useUser';
import { useScene } from '@/feature/useScene';

export function useHome() {
  const { userData, setUserData, setAccessToken } = useUser();
  const { setScene } = useScene();

  const [isOpenLoginModal, setIsOpenLoginModal] = useState<boolean>(false);

  const controllerRef = useRef<AbortController | null>(null);

  // OAuth 콜백 처리는 이제 App.tsx에서 전담합니다.
  useEffect(() => {
    // 필요한 경우 초기화 로직 작성
  }, []);

  const onClickLoginBtn = useCallback(() => {
    setIsOpenLoginModal(true);
  }, []);

  const onClickMyPageBtn = useCallback(() => {
    if (!userData) {
      setIsOpenLoginModal(true);

      return;
    }

    setScene('my-page');
  }, [userData, setScene, setIsOpenLoginModal]);

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
