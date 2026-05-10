'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { webBridge } from '@/bridge/webBridge';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ScenarioCard } from '@/components/ScenarioCard';
import { ScenarioModal } from '@/components/ScenarioModal';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import type { ApiScenarioSummary } from '@/lib/api';
import { logout as requestLogout } from '@/lib/api/auth';
import { useCategoriesQuery, useScenariosQuery } from '@/queries/scenarios';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { accessToken, refreshToken, _hasHydrated, clearAuth } = useAuthStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ApiScenarioSummary | null>(null);
  const showBrowserLogout = useSyncExternalStore(
    subscribeBrowserLogoutStore,
    getBrowserLogoutSnapshot,
    getServerBrowserLogoutSnapshot,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      if (refreshToken) {
        await requestLogout(refreshToken);
      }
    } catch (error) {
      console.warn('[Auth] logout failed:', error);
    } finally {
      clearAuth();
      router.replace('/login');
      setIsLoggingOut(false);
    }
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
          {showBrowserLogout && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingOut ? '로그아웃 중' : '로그아웃'}
            </button>
          )}
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

function subscribeBrowserLogoutStore() {
  return () => {};
}

function getBrowserLogoutSnapshot() {
  return !webBridge.isAvailable();
}

function getServerBrowserLogoutSnapshot() {
  return false;
}
