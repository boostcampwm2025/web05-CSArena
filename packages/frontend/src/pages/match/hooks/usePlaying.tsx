import { useRef, useState } from 'react';

import { getSocket } from '@/lib/socket';
import { SubmitAnswerRes } from '@/lib/socket/event';

export function usePlaying() {
  const [answer, setAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmit, setIsSubmit] = useState<boolean>(false);

  const socketRef = useRef(getSocket());

  const onClickSubmitBtn = () => {
    if (isSubmitting || isSubmit) {
      return;
    }

    const trimmed = answer.trim();

    if (trimmed.length === 0) {
      // 빈 답 제출 방지
      return;
    }

    setIsSubmitting(true);

    socketRef.current.emit('submit:answer', { trimmed }, (ack: SubmitAnswerRes) => {
      setIsSubmitting(false);

      if (!ack.ok) {
        // {'ok': false; 'error': string}
        return;
      }

      setIsSubmit(true);
    });
  };

  return { isSubmit, isSubmitting, setAnswer, onClickSubmitBtn };
}
