import { useCallback, useEffect, useRef, useState } from 'react';

import { useUser } from '@/feature/auth/useUser';
import {
  useCategory,
  usePhase,
  useQuestion,
  useResult,
  useRound,
} from '@/feature/single-play/useRound';

import { CategoryItem } from '@/pages/single-play/types/types';
import { fetchCategories, fetchQuestions } from '@/lib/api/single-play';

export function usePreparing() {
  const { accessToken } = useUser();
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategory();
  const { setPhase } = usePhase();
  const { setCurRound, setTotalRounds } = useRound();
  const { setQuestions } = useQuestion();
  const { setSubmitAnswers, setCorrectCnt, setTotalPoints } = useResult();

  const [categories, setCategories] = useState<Record<number, CategoryItem>>({});
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);

  const questionControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const getCategories = async () => {
      setIsLoadingCategories(true);

      try {
        const data = await fetchCategories(accessToken, controller.signal);
        const entries: Array<[number, CategoryItem]> = data.categories.map((category) => [
          category.id,
          { ...category, isSelected: false },
        ]);

        setCategories(Object.fromEntries(entries));
        setSelectedCategoryIds([]);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }

        // TODO: 에러 발생 시 띄울 공통 모달 구현 및 에러 출력
      } finally {
        setIsLoadingCategories(false);
      }
    };

    void getCategories();

    return () => {
      controller.abort();
      questionControllerRef.current?.abort();
    };
  }, [setSelectedCategoryIds]);

  const onClickCategoryBtn = useCallback((categoryId: number) => {
    setCategories((prev) => {
      const target = prev[categoryId];

      if (!target) {
        return prev;
      }

      return { ...prev, [categoryId]: { ...target, isSelected: !target.isSelected } };
    });
  }, []);

  useEffect(() => {
    const nextSelectedIds = Object.values(categories)
      .filter((c) => c.isSelected)
      .map((c) => c.id);

    setSelectedCategoryIds(nextSelectedIds);
  }, [categories, setSelectedCategoryIds]);

  const onClickStartBtn = useCallback(async () => {
    questionControllerRef.current?.abort();

    const controller = new AbortController();
    questionControllerRef.current = controller;

    if (selectedCategoryIds.length === 0) {
      return;
    }

    setIsLoadingQuestions(true);

    try {
      const data = await fetchQuestions(accessToken, selectedCategoryIds, controller.signal);

      setCurRound(0);
      setTotalRounds(data.questions.length);
      setQuestions(data.questions);
      setSubmitAnswers([]);
      setCorrectCnt(0);
      setTotalPoints(0);

      setPhase('playing');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // TODO: 에러 발생 시 띄울 공통 모달 구현 및 에러 출력
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [
    selectedCategoryIds,
    setPhase,
    setCurRound,
    setTotalRounds,
    setQuestions,
    setSubmitAnswers,
    setCorrectCnt,
    setTotalPoints,
  ]);

  return {
    categories,
    selectedCategoryIds,
    isLoadingCategories,
    isLoadingQuestions,
    onClickCategoryBtn,
    onClickStartBtn,
  };
}
