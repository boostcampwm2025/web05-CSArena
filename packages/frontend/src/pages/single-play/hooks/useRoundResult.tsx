import { useCallback, useEffect, useRef } from 'react';

import { fetchQuestion } from '@/lib/api/single-play';

import { useUser } from '@/feature/auth/useUser';
import { useCategory, usePhase, useQuestion } from '@/feature/single-play/useRound';

export function useRoundResult() {
  const { accessToken, userData } = useUser();
  const { selectedCategoryIds } = useCategory();
  const { phase, setPhase } = usePhase();
  const { curQuestion, setCurQuestion } = useQuestion();

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase.kind !== 'result') {
      return;
    }

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    const prefetchQuestion = async () => {
      try {
        const data = await fetchQuestion(accessToken, selectedCategoryIds, controller.signal);

        setPhase((prev) => (prev.kind === 'result' ? { ...prev, next: data.question } : prev));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }

        // TODO: 에러 발생 시 띄울 공통 모달 구현 및 에러 출력
      } finally {
        setPhase((prev) =>
          prev.kind === 'result' ? { ...prev, isFetchingQuestion: false } : prev,
        );
      }
    };

    void prefetchQuestion();

    return () => {
      controller.abort();
    };
  }, [phase.kind, setPhase, accessToken, selectedCategoryIds]);

  const onClickNextBtn = useCallback(async () => {
    if (phase.kind !== 'result') {
      return;
    }

    if (phase.next) {
      setCurQuestion(phase.next);
      setPhase((prev) => {
        if (prev.kind !== 'result') {
          return prev;
        }

        return { kind: 'playing' };
      });

      return;
    }

    if (phase.isFetchingQuestion) {
      return;
    }

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setPhase((prev) => (prev.kind === 'result' ? { ...prev, isFetchingQuestion: true } : prev));

    try {
      const data = await fetchQuestion(accessToken, selectedCategoryIds, controller.signal);

      setCurQuestion(data.question);
      setPhase((prev) => {
        if (prev.kind !== 'result') {
          return prev;
        }

        return {
          kind: 'playing',
        };
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 에러 발생 시 띄울 공통 모달 구현 및 에러 출력
    } finally {
      setPhase((prev) => (prev.kind === 'result' ? { ...prev, isFetchingQuestion: false } : prev));
    }
  }, [phase, setPhase, setCurQuestion, accessToken, selectedCategoryIds]);

  if (phase.kind !== 'result') {
    return {
      nickname: userData?.nickname,
      curQuestion,
      submittedAnswer: '',
      isCorrect: false,
      aiFeedback: '',
      isFetchingQuestion: false,
      onClickNextBtn,
    };
  }

  return {
    nickname: userData?.nickname,
    curQuestion,
    submittedAnswer: phase.result.submittedAnswer,
    isCorrect: phase.result.isCorrect,
    aiFeedback: phase.result.aiFeedback,
    isFetchingQuestion: phase.isFetchingQuestion,
    onClickNextBtn,
  };
}
