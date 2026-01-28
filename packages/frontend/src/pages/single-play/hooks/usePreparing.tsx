import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchCategories, fetchQuestion, startSession } from '@/lib/api/single-play';

import { CategoryItem } from '@/pages/single-play/types/types';

import { useUser } from '@/feature/auth/useUser';
import { useCategory, useMatchId, usePhase, useQuestion } from '@/feature/single-play/useRound';

export function usePreparing() {
  const { accessToken } = useUser();
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategory();
  const { setPhase } = usePhase();
  const { setCurQuestion } = useQuestion();
  const { setMatchId } = useMatchId();

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
  }, [accessToken, setSelectedCategoryIds]);

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
      // 세션 시작하여 matchId 받기
      const sessionData = await startSession(accessToken, controller.signal);
      setMatchId(sessionData.matchId);

      // 첫 문제 받기
      const data = await fetchQuestion(accessToken, selectedCategoryIds, controller.signal);

      setCurQuestion(data.question);
      setPhase({ kind: 'playing' });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }

      // 세션 시작 실패 시 matchId 초기화
      setMatchId(null);

      // TODO: 에러 발생 시 띄울 공통 모달 구현 및 에러 출력
      console.error('싱글플레이 시작 중 오류 발생:', e);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [accessToken, selectedCategoryIds, setPhase, setCurQuestion, setMatchId]);

  return {
    categories,
    selectedCategoryIds,
    isLoadingCategories,
    isLoadingQuestions,
    onClickCategoryBtn,
    onClickStartBtn,
  };
}
