import { useCallback, useEffect, useState } from 'react';
import {
  Category,
  ProblemBankFilters,
  ProblemBankItem,
  ProblemBankStatistics,
} from '@/shared/type';
import { useUser } from '@/feature/auth/useUser';
import { useScene } from '@/feature/useScene';
import {
  ApiError,
  fetchCategories,
  fetchProblemBank,
  fetchStatistics,
  updateBookmark,
} from '@/lib/api/problem-bank';

export function useProblemBank() {
  const { accessToken } = useUser();
  const { setScene } = useScene();
  const [items, setItems] = useState<ProblemBankItem[]>([]);
  const [statistics, setStatistics] = useState<ProblemBankStatistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Partial<ProblemBankFilters>>({
    page: 1,
    limit: 10,
    categoryIds: [],
    search: '',
  });

  // UI States
  const [selectedProblem, setSelectedProblem] = useState<ProblemBankItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const loadData = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchProblemBank(accessToken, filters);
      setItems(response.items);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setScene('home');

          return;
        }

        setError(err.message);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load problem bank';
        setError(errorMessage);
      }

      // eslint-disable-next-line no-console
      console.error('Failed to load problem bank:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, accessToken, setScene]);

  const loadStatistics = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      const stats = await fetchStatistics(accessToken);
      setStatistics(stats);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setScene('home');

        return;
      }

      // eslint-disable-next-line no-console
      console.error('Failed to load statistics:', err);
    }
  }, [accessToken, setScene]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load categories:', err);
    }
  }, []);

  const toggleBookmark = useCallback(
    async (problemId: number, currentBookmarkState: boolean) => {
      if (!accessToken) {
        return;
      }

      const newBookmarkState = !currentBookmarkState;

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === problemId ? { ...item, isBookmarked: newBookmarkState } : item,
        ),
      );

      try {
        await updateBookmark(accessToken, problemId, newBookmarkState);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setScene('home');

          return;
        }

        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === problemId ? { ...item, isBookmarked: currentBookmarkState } : item,
          ),
        );
        // eslint-disable-next-line no-console
        console.error('Failed to update bookmark:', err);
        setError('Failed to update bookmark');
      }
    },
    [accessToken, setScene],
  );

  const updateFilters = useCallback((newFilters: Partial<ProblemBankFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // Filter Handlers
  const handleDifficultyChange = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard' | null) => {
      updateFilters({ difficulty: difficulty || undefined });
    },
    [updateFilters],
  );

  const handleResultChange = useCallback(
    (result: 'correct' | 'incorrect' | 'partial' | null) => {
      updateFilters({ result: result || undefined });
    },
    [updateFilters],
  );

  const handleBookmarkFilterChange = useCallback(
    (isBookmarked: boolean | null) => {
      updateFilters({ isBookmarked: isBookmarked === null ? undefined : isBookmarked });
    },
    [updateFilters],
  );

  const applySearch = useCallback(() => {
    updateFilters({ search: searchInput || undefined });
  }, [updateFilters, searchInput]);

  const handleCategoryApply = useCallback(
    (categoryIds: number[]) => {
      updateFilters({ categoryIds });
    },
    [updateFilters],
  );

  const handleCategoryRemove = useCallback(
    (categoryId: number) => {
      const currentIds = filters.categoryIds || [];
      const newIds = currentIds.filter((id) => id !== categoryId);
      updateFilters({ categoryIds: newIds });
    },
    [filters.categoryIds, updateFilters],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadStatistics();
    void loadCategories();
  }, [loadStatistics, loadCategories]);

  return {
    items,
    statistics,
    categories,
    totalPages,
    currentPage,
    isLoading,
    error,
    filters,
    // UI States & Actions
    selectedProblem,
    setSelectedProblem,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    searchInput,
    setSearchInput,
    // Actions
    loadData,
    toggleBookmark,
    goToPage,
    handleDifficultyChange,
    handleResultChange,
    handleBookmarkFilterChange,
    applySearch,
    handleCategoryApply,
    handleCategoryRemove,
  };
}
