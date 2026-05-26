// 시나리오 목록 조회 쿼리 훅
'use client';

import { useQuery } from '@tanstack/react-query';
import { getScenarios } from '@/lib/api';

export const scenarioQueryKeys = {
  all: ['scenarios'] as const,
};

export function useScenariosQuery(enabled = true) {
  return useQuery({
    queryKey: scenarioQueryKeys.all,
    queryFn: () => getScenarios(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
