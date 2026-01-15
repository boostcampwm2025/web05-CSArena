import { useRef, useState } from 'react';

import { MatchEnqueueRes } from '@/lib/socket/event';
import { getSocket } from '@/lib/socket/index';

import { useScene } from '@/feature/useScene';
import { useMatch } from '@/feature/matching/useMatch';

export function useMatchResult() {
  const { setScene } = useScene();
  const { setMatchState } = useMatch();

  const [isClickedRematchBtn, setIsClickedRematchBtn] = useState<boolean>(false);
  const [isClickedExitBtn, setIsClickedExitBtn] = useState<boolean>(false);

  const socketRef = useRef(getSocket());

  const onClickRematchBtn = () => {
    setIsClickedRematchBtn(true);

    socketRef.current.emit('match:enqueue', undefined, (ack: MatchEnqueueRes) => {
      if (!ack.ok) {
        // TODO: 소켓 연결 실패 시 메인 화면으로 돌아가거나 자동 재연결 등 에러 헨들링 로직 추가
        return;
      }
    });

    setIsClickedRematchBtn(false);
    setMatchState('matching');
  };

  const onClickExitBtn = () => {
    setIsClickedExitBtn(true);
    setScene('home');
  };

  return {
    isClickedRematchBtn,
    isClickedExitBtn,
    onClickRematchBtn,
    onClickExitBtn,
  };
}
