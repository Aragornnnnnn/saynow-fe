// 시나리오 선택 페이지
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiScenarioSummary } from '@/lib/api';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ScenarioCard } from '@/components/ScenarioCard';
import { ScenarioModal } from '@/components/ScenarioModal';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useCategoriesQuery, useScenariosQuery } from '@/queries/scenarios';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { accessToken, refreshToken, _hasHydrated } = useAuthStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ApiScenarioSummary | null>(null);
  const canFetch = _hasHydrated && (!!accessToken || !!refreshToken);
  const categoriesQuery = useCategoriesQuery(canFetch);
  const scenariosQuery = useScenariosQuery(canFetch);

  // hydration 완료 후 토큰 없으면 로그인 페이지로
  useEffect(() => {
    if (_hasHydrated && !accessToken && !refreshToken) {
      router.replace('/login');
    }
  }, [_hasHydrated, accessToken, refreshToken, router]);

  useBackButtonBridge(() => {
    if (selectedScenario) setSelectedScenario(null);
  });

  const categories = categoriesQuery.data ?? [];
  const allScenarios = scenariosQuery.data ?? [];
  const scenarios = selectedCategoryId
    ? allScenarios.filter((s) => s.categoryId === selectedCategoryId)
    : allScenarios;
  const dataError = categoriesQuery.error ?? scenariosQuery.error;

  function handleCategoryChange(categoryId: string | null) {
    setSelectedCategoryId(categoryId);
  }

  function handleRetry() {
    categoriesQuery.refetch();
    scenariosQuery.refetch();
  }

  if (!_hasHydrated || !canFetch) return null;

  if (dataError) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{dataError.message}</p>
          <button onClick={handleRetry} className="text-sm text-primary font-medium">
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-dvh bg-background">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">시나리오 선택</h1>
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategoryId}
          onChange={handleCategoryChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 overscroll-y-contain">
        {scenariosQuery.isPending ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.scenarioId} scenario={scenario} onClick={setSelectedScenario} />
            ))}
          </div>
        )}
      </div>

      {selectedScenario && (
        <ScenarioModal scenario={selectedScenario} onClose={() => setSelectedScenario(null)} />
      )}
    </main>
  );
}
