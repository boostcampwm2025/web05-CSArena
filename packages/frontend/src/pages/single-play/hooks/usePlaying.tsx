import { useCallback, useRef, useState } from 'react';

import { submitAnswer } from '@/lib/api/single-play';

import { useUser } from '@/feature/auth/useUser';
import { usePhase } from '@/feature/single-play/useRound';

export function usePlaying() {
  const { accessToken } = useUser();

  const { phase, setPhase } = usePhase();

  const [answer, setAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitControllerRef = useRef<AbortController | null>(null);

  const onClickSubmitBtn = useCallback(async () => {
    const trimmed = answer.trim();

    if (trimmed === '') {
      return;
    }

    submitControllerRef.current?.abort();

    const controller = new AbortController();
    submitControllerRef.current = controller;

    setIsSubmitting(true);

    try {
      const data = await submitAnswer(
        accessToken,
        { questionId: Number(phase.question.id), answer: trimmed },
        controller.signal,
      );

      setPhase({
        kind: 'result',
        result: {
          answer: data.grade.answer,
          isCorrect: data.grade.isCorrect,
          feedback: data.grade.feedback,
        },
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 공통 에러 모달
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, answer, phase, setPhase]);

  return {
    answer,
    setAnswer,
    isSubmitting,
    onClickSubmitBtn,
  };
}
