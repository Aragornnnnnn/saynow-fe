'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ScenarioCard } from '@/components/ScenarioCard';
import { ScenarioModal } from '@/components/ScenarioModal';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import type { ApiScenarioSummary } from '@/lib/api';
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
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">{dataError.message}</p>
          <button onClick={handleRetry} className="text-sm font-medium text-primary">
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-background">
      <div className="px-4 pb-4 pt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">시나리오 선택</h1>
          <Link
            href="/me"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            내 정보
          </Link>
        </div>
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategoryId}
          onChange={handleCategoryChange}
        />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6">
        {scenariosQuery.isPending ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.scenarioId}
                scenario={scenario}
                onClick={setSelectedScenario}
              />
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
