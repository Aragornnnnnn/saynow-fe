// 피드백 생성 및 조회 쿼리 훅
'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFeedback, streamFeedback } from '@/lib/api';
import type { ApiFeedback, ApiTurnFeedback } from '@/lib/api';

export const feedbackQueryKeys = {
  detail: (sessionId: number) => ['feedback', sessionId] as const,
};

// 두 훅이 공유하는 반환 타입 — 페이지에서 갈아끼울 때 타입 변경 없음
export interface FeedbackState {
  header: Omit<ApiFeedback, 'turnFeedbacks'> | null;
  turnFeedbacks: ApiTurnFeedback[];
  isDone: boolean;
  error: Error | null;
}

// ─── POST 방식 ────────────────────────────────────────────────────────────────

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

// ─── SSE 방식 ─────────────────────────────────────────────────────────────────

export function useFeedbackStream(sessionId: number): FeedbackState {
  const [header, setHeader] = useState<Omit<ApiFeedback, 'turnFeedbacks'> | null>(null);
  const [turnFeedbacks, setTurnFeedbacks] = useState<ApiTurnFeedback[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        for await (const event of streamFeedback(sessionId)) {
          if (event.type === 'header') {
            const { type: _, ...rest } = event;
            setHeader(rest);
          } else if (event.type === 'turn') {
            setTurnFeedbacks((prev) => [...prev, event.turn]);
          } else if (event.type === 'done') {
            setIsDone(true);
          }
        }
        setIsDone(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('SSE 스트림 오류'));
        setIsDone(true);
      }
    })();
  }, [sessionId]);

  return { header, turnFeedbacks, isDone, error };
}
