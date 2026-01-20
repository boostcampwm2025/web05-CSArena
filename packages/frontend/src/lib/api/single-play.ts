import {
  GetCategoriesRes,
  GetQuestionsRes,
  SubmitAnswerReq,
  SubmitAnswerRes,
} from '@/pages/single-play/types/types';

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

export function submitAnswer(payload: SubmitAnswerReq, signal?: AbortSignal) {
  return request<SubmitAnswerRes>('api/singleplay/submit', {
    method: 'POST',
    body: payload,
    signal,
  });
}
