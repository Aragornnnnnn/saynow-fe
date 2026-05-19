// 피드백 생성 및 조회 쿼리 훅
'use client';

import { useQuery } from '@tanstack/react-query';
import { createFeedback } from '@/lib/api';

export const feedbackQueryKeys = {
  detail: (sessionId: number) => ['feedback', sessionId] as const,
};

export function useFeedbackQuery(sessionId: number, enabled = true) {
  return useQuery({
    queryKey: feedbackQueryKeys.detail(sessionId),
    queryFn: () => createFeedback(sessionId),
    enabled,
    retry: false,
  });
}
