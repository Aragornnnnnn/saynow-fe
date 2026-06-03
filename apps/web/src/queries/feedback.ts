// 피드백 생성 쿼리 훅
'use client';

import { useQuery } from '@tanstack/react-query';
import { createFeedback } from '@/lib/api';
import type { ApiFeedback, ApiTurnFeedback } from '@/lib/api';

export const feedbackQueryKeys = {
  detail: (sessionId: number) => ['feedback', sessionId] as const,
};

// 피드백 페이지에서 사용하는 생성 상태
export interface FeedbackState {
  header: Omit<ApiFeedback, 'turnFeedbacks'> | null;
  turnFeedbacks: ApiTurnFeedback[];
  isDone: boolean;
  error: Error | null;
}

// ─── 피드백 생성 ───────────────────────────────────────────────────────────────

export function useFeedbackQuery(sessionId: number, enabled = true): FeedbackState {
  const query = useQuery({
    queryKey: feedbackQueryKeys.detail(sessionId),
    queryFn: () => createFeedback(sessionId),
    enabled,
    retry: false,
  });

  if (!query.data) {
    return {
      header: null,
      turnFeedbacks: [],
      isDone: !query.isPending,
      error: query.error,
    };
  }

  const { turnFeedbacks, ...header } = query.data;
  return { header, turnFeedbacks, isDone: true, error: null };
}
