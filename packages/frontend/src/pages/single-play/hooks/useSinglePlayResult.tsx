import { useUser } from '@/feature/auth/useUser';
import { useCallback, useEffect, useRef } from 'react';

import {
  useCategory,
  usePhase,
  useQuestion,
  useResult,
  useRound,
} from '@/feature/single-play/useRound';
import { fetchQuestions } from '@/lib/api/single-play';

export function useSinglePlayResult() {
  const { selectedCategoryIds } = useCategory();
  const { userData, accessToken } = useUser();
  const { setCurRound, setTotalRounds } = useRound();
  const { setPhase } = usePhase();
  const { questions, setQuestions } = useQuestion();
  const {
    submitAnswers,
    setSubmitAnswers,
    correctCnt,
    setCorrectCnt,
    totalPoints,
    setTotalPoints,
  } = useResult();

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const clearCtx = useCallback(() => {
    setCurRound(0);
    setTotalRounds(0);
    setQuestions([]);
    setSubmitAnswers([]);
    setCorrectCnt(0);
    setTotalPoints(0);
  }, [setCurRound, setTotalRounds, setQuestions, setSubmitAnswers, setCorrectCnt, setTotalPoints]);

  const onClickStudyAgainBtn = useCallback(async () => {
    if (selectedCategoryIds.length === 0) {
      clearCtx();
      setPhase('preparing');

      return;
    }

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    clearCtx();

    try {
      const data = await fetchQuestions(accessToken, selectedCategoryIds, controller.signal);

      setCurRound(0);
      setTotalRounds(data.questions.length);
      setQuestions(data.questions);

      setPhase('playing');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 에러 발생 시 띄울 공통 모달 구현 및 에러 출력
    }
  }, [clearCtx, selectedCategoryIds, setCurRound, setTotalRounds, setQuestions, setPhase]);

  const onClickSelectOtherCategoryBtn = useCallback(() => {
    controllerRef.current?.abort();

    clearCtx();
    setPhase('preparing');
  }, [clearCtx, setPhase]);

  return {
    nickname: userData?.nickname,
    questions,
    submitAnswers,
    correctCnt,
    totalPoints,
    onClickStudyAgainBtn,
    onClickSelectOtherCategoryBtn,
  };
}
