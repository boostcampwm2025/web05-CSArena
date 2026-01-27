import { useEffect, useRef, useState } from 'react';

import { getSocket } from '@/lib/socket';
import { SubmitAnswerRes } from '@/lib/socket/event';

import { useUser } from '@/feature/auth/useUser';

export function usePlaying() {
  const { accessToken } = useUser();

  const [answer, setAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitState, setSubmitState] = useState({
    isSubmit: false,
    opponentSubmitted: false,
  });

  const socketRef = useRef(getSocket(accessToken));

  const onClickSubmitBtn = () => {
    if (isSubmitting || submitState.isSubmit) {
      return;
    }

    const trimmed = answer.trim();

    if (trimmed.length === 0) {
      // 빈 답 제출 방지
      return;
    }

    setIsSubmitting(true);

    socketRef.current.emit('submit:answer', { answer: trimmed }, (ack: SubmitAnswerRes) => {
      setIsSubmitting(false);

      if (!ack.ok) {
        return;
      }

      setSubmitState({
        isSubmit: true,
        opponentSubmitted: ack.opponentSubmitted ?? false,
      });
    });
  };

  useEffect(() => {
    const socket = socketRef.current;

    const handleOpponentSubmitted = () => {
      setSubmitState((prev) => ({ ...prev, opponentSubmitted: true }));
    };

    const handleRoundReady = () => {
      // 새 라운드 시작 시 상태 초기화
      setSubmitState({ isSubmit: false, opponentSubmitted: false });
      setAnswer('');
    };

    socket.on('opponent:submitted', handleOpponentSubmitted);
    socket.on('round:ready', handleRoundReady);

    return () => {
      socket.off('opponent:submitted', handleOpponentSubmitted);
      socket.off('round:ready', handleRoundReady);
    };
  }, []);

  return {
    isSubmit: submitState.isSubmit,
    isSubmitting,
    opponentSubmitted: submitState.opponentSubmitted,
    answer,
    setAnswer,
    onClickSubmitBtn,
  };
}
