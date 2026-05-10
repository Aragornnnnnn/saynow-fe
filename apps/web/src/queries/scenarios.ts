'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategories, getScenarios } from '@/lib/api';

export const scenarioQueryKeys = {
  categories: ['categories'] as const,
  scenarios: ['scenarios'] as const,
};

export function useCategoriesQuery(enabled = true) {
  return useQuery({
    queryKey: scenarioQueryKeys.categories,
    queryFn: async () => {
      const data = await getCategories();
      return data.categories;
    },
    enabled,
  });
}

export function useScenariosQuery(enabled = true) {
  return useQuery({
    queryKey: scenarioQueryKeys.scenarios,
    queryFn: async () => {
      const data = await getScenarios();
      return data.scenarios;
    },
    enabled,
  });
}
