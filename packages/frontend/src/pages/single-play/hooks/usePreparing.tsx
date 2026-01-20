import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { usePhase } from '@/feature/single-play/useRound';
import { useRound, useQuestion, useResult } from '@/feature/single-play/useRound';

import { CategoryItem } from '@/pages/single-play/types/types';
import { fetchCategories, fetchQuestions } from '@/lib/api/single-play';

export function usePreparing() {
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
        const data = await fetchCategories(controller.signal);
        const entries: Array<[number, CategoryItem]> = data.categories.map((category) => [
          category.id,
          { ...category, isSelected: false },
        ]);

        setCategories(Object.fromEntries(entries));
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
  }, []);

  const onClickCategoryBtn = useCallback((categoryId: number) => {
    setCategories((prev) => {
      const target = prev[categoryId];

      if (!target) {
        return prev;
      }

      return {
        ...prev,
        [categoryId]: { ...target, isSelected: !target.isSelected },
      };
    });
  }, []);

  const selectedCategoryId = useMemo(() => {
    return Object.values(categories)
      .filter((c) => c.isSelected)
      .map((c) => c.id);
  }, [categories]);

  const onClickStartBtn = useCallback(async () => {
    questionControllerRef.current?.abort();

    const controller = new AbortController();
    questionControllerRef.current = controller;

    if (selectedCategoryId.length === 0) {
      return;
    }

    setIsLoadingQuestions(true);

    try {
      const data = await fetchQuestions(selectedCategoryId, controller.signal);

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
  }, [setPhase]);

  return {
    categories,
    selectedCategoryId,
    isLoadingCategories,
    isLoadingQuestions,
    onClickCategoryBtn,
    onClickStartBtn,
  };
}
