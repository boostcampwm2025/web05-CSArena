import { useCallback, useRef, useState } from 'react';

import { submitAnswer } from '@/lib/api/single-play';

import { useUser } from '@/feature/auth/useUser';
import { useMatchId, usePhase, useQuestion } from '@/feature/single-play/useRound';

export function usePlaying() {
  const { accessToken } = useUser();

  const { phase, setPhase } = usePhase();
  const { curQuestion } = useQuestion();
  const { matchId } = useMatchId();

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

    if (matchId === null) {
      // TODO: 공통 에러 모달 - matchId가 없으면 세션이 시작되지 않은 것
      console.error('matchId가 없습니다. 세션을 다시 시작해주세요.');

      return;
    }

    setIsSubmitting(true);

    try {
      const data = await submitAnswer(
        accessToken,
        { matchId, questionId: Number(curQuestion?.id), answer: trimmed },
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
  }, [accessToken, answer, phase.kind, setPhase, curQuestion, matchId]);

  return {
    answer,
    setAnswer,
    curQuestion,
    isSubmitting,
    onClickSubmitBtn,
  };
}
