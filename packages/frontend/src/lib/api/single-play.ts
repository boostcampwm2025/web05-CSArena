import { GetCategoriesRes, GetQuestionsRes } from '@/pages/single-play/types/types';

import { request } from './request';

export function fetchCategories(signal?: AbortSignal) {
  return request<GetCategoriesRes>('api/singleplay/categories', { signal });
}

export function fetchQuestions(categoryIds: number[], signal?: AbortSignal) {
  return request<GetQuestionsRes>('api/singleplay/questions', {
    query: { categoryId: categoryIds },
    signal,
  });
}
