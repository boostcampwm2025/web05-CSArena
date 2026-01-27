import { useCallback, useRef, useState } from 'react';

import { submitAnswer } from '@/lib/api/single-play';

import { useUser } from '@/feature/auth/useUser';
import { usePhase, useQuestion } from '@/feature/single-play/useRound';

export function usePlaying() {
  const { accessToken } = useUser();

  const { phase, setPhase } = usePhase();
  const { curQuestion } = useQuestion();

  const [answer, setAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitControllerRef = useRef<AbortController | null>(null);

  const onClickSubmitBtn = useCallback(async () => {
    if (phase.kind !== 'playing') {
      return;
    }

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
        { questionId: Number(curQuestion?.id), answer: trimmed },
        controller.signal,
      );

      setPhase({
        kind: 'result',
        result: {
          submittedAnswer: data.grade.submittedAnswer,
          isCorrect: data.grade.isCorrect,
          aiFeedback: data.grade.aiFeedback,
        },
        next: undefined,
        isFetchingQuestion: false,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 공통 에러 모달
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, answer, phase.kind, setPhase, curQuestion]);

  return {
    answer,
    setAnswer,
    curQuestion,
    isSubmitting,
    onClickSubmitBtn,
  };
}
