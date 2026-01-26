import { useCallback, useRef, useState } from 'react';

import { submitAnswer } from '@/lib/api/single-play';

import { useUser } from '@/feature/auth/useUser';
import { usePhase, useQuestion, useResult } from '@/feature/single-play/useRound';

export function usePlaying() {
  const { accessToken } = useUser();

  const { setPhase } = usePhase();
  const { question } = useQuestion();
  const { setSubmitAnswer } = useResult();

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
        { questionId: Number(question?.id), answer: trimmed },
        controller.signal,
      );

      setSubmitAnswer({ answer: trimmed, isCorrect: data.grade.isCorrect });

      setPhase('round-result');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 공통 에러 모달
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, answer, question, setSubmitAnswer, setPhase]);

  return {
    question,
    answer,
    setAnswer,
    isSubmitting,
    onClickSubmitBtn,
  };
}
