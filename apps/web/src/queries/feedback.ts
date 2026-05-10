'use client';

import { useQuery } from '@tanstack/react-query';
import { getSessionFeedback } from '@/lib/api';

const FEEDBACK_PENDING_CODES = new Set(['SESSION_IN_PROGRESS', 'FEEDBACK_NOT_READY']);
const FEEDBACK_POLL_INTERVAL_MS = 2_000;

export const feedbackQueryKeys = {
  detail: (sessionId: string) => ['feedback', sessionId] as const,
};

export function isFeedbackPending(error: unknown) {
  return error instanceof Error && FEEDBACK_PENDING_CODES.has((error as Error & { code?: string }).code ?? '');
}

export function useSessionFeedbackQuery(sessionId: string) {
  return useQuery({
    queryKey: feedbackQueryKeys.detail(sessionId),
    queryFn: () => getSessionFeedback(sessionId),
    refetchInterval: (query) => (isFeedbackPending(query.state.error) ? FEEDBACK_POLL_INTERVAL_MS : false),
    retry: false,
    throwOnError: false,
  });
}
