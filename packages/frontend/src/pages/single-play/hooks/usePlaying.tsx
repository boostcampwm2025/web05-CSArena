import { useCallback, useRef, useState } from 'react';

import { submitAnswer } from '@/lib/api/single-play';

import { usePhase, useQuestion, useResult, useRound } from '@/feature/single-play/useRound';
import {} from '@/feature/matching/useRound';

export function usePlaying() {
  const { setPhase } = usePhase();
  const { curRound } = useRound();
  const { questions } = useQuestion();
  const { setSubmitAnswers, setCorrectCnt, setTotalPoints } = useResult();

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
        { questionId: questions[curRound].id, answer: trimmed },
        controller.signal,
      );

      setSubmitAnswers((prev) => [...prev, { answer: trimmed, isCorrect: data.grade.isCorrect }]);
      setCorrectCnt((prev) => (data.grade.isCorrect ? prev + 1 : prev));
      setTotalPoints(data.totalScore);

      setPhase('round-result');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 공통 에러 모달
    } finally {
      setIsSubmitting(false);
    }
  }, [answer, questions, curRound, setSubmitAnswers, setCorrectCnt, setTotalPoints, setPhase]);

  return {
    curRound,
    question: questions[curRound],
    answer,
    setAnswer,
    isSubmitting,
    onClickSubmitBtn,
  };
}
