'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle2, ChevronRight } from 'lucide-react';
import { CategoryFilter } from '@/components/CategoryFilter';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import type { ApiScenario, ApiCategory } from '@/lib/api';
import { useScenariosQuery } from '@/queries/scenarios';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { accessToken, refreshToken, _hasHydrated } = useAuthStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedScenarioId, setExpandedScenarioId] = useState<number | null>(null);
  const canFetch = _hasHydrated && (!!accessToken || !!refreshToken);
  const { data, isPending, error, refetch } = useScenariosQuery(canFetch);

  useEffect(() => {
    if (_hasHydrated && !accessToken && !refreshToken) {
      router.replace('/login');
    }
  }, [_hasHydrated, accessToken, refreshToken, router]);

  useBackButtonBridge(() => {
    if (expandedScenarioId !== null) setExpandedScenarioId(null);
  });

  if (!_hasHydrated || !canFetch) return null;

  const categories = data?.categories ?? [];

  // 선택된 카테고리 또는 첫 번째 비잠금 카테고리
  const activeCategory: ApiCategory | undefined =
    selectedCategoryId !== null
      ? categories.find((c) => c.categoryId === selectedCategoryId)
      : categories.find((c) => !c.categoryLocked);

  function handleCategoryChange(id: number | null) {
    setSelectedCategoryId(id);
    setExpandedScenarioId(null);
  }

  function handleBadgeClick(scenario: ApiScenario) {
    if (scenario.locked) return;
    setExpandedScenarioId((prev) => (prev === scenario.scenarioId ? null : scenario.scenarioId));
  }

  if (error) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background px-6">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">{error.message}</p>
          <button onClick={() => refetch()} className="text-sm font-medium text-primary">
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-background">
      {/* 헤더 */}
      <div className="px-4 pb-3 pt-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">SayNow</h1>
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategoryId ?? activeCategory?.categoryId ?? null}
          onChange={handleCategoryChange}
        />
      </div>

      {/* 시나리오 목록 */}
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 pb-10">
        {isPending ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-20 w-20 animate-pulse rounded-full bg-card" />
                <div className="h-4 w-32 animate-pulse rounded bg-card" />
              </div>
            ))}
          </div>
        ) : activeCategory ? (
          <ScenarioBadgeList
            scenarios={activeCategory.scenarios}
            expandedId={expandedScenarioId}
            onBadgeClick={handleBadgeClick}
            onStart={(scenarioId) => router.push(`/conversation/${scenarioId}`)}
          />
        ) : null}
      </div>
    </main>
  );
}

interface ScenarioBadgeListProps {
  scenarios: ApiScenario[];
  expandedId: number | null;
  onBadgeClick: (scenario: ApiScenario) => void;
  onStart: (scenarioId: number) => void;
}

function ScenarioBadgeList({ scenarios, expandedId, onBadgeClick, onStart }: ScenarioBadgeListProps) {
  return (
    <div className="mt-6 flex flex-col items-center">
      {scenarios.map((scenario, index) => (
        <ScenarioBadgeItem
          key={scenario.scenarioId}
          scenario={scenario}
          index={index}
          isLast={index === scenarios.length - 1}
          isExpanded={expandedId === scenario.scenarioId}
          onBadgeClick={onBadgeClick}
          onStart={onStart}
        />
      ))}
    </div>
  );
}

interface ScenarioBadgeItemProps {
  scenario: ApiScenario;
  index: number;
  isLast: boolean;
  isExpanded: boolean;
  onBadgeClick: (scenario: ApiScenario) => void;
  onStart: (scenarioId: number) => void;
}

function ScenarioBadgeItem({ scenario, index, isLast, isExpanded, onBadgeClick, onStart }: ScenarioBadgeItemProps) {
  const isLocked = scenario.locked;
  const isCleared = scenario.cleared;

  return (
    <div className="flex w-full flex-col items-center">
      {/* 뱃지 버튼 */}
      <button
        onClick={() => onBadgeClick(scenario)}
        disabled={isLocked}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all duration-150 active:scale-95 ${
          isLocked
            ? 'border-border bg-card text-muted-foreground opacity-50 cursor-default'
            : isCleared
              ? 'border-green-400 bg-green-50'
              : 'border-primary bg-[#FFF4ED] shadow-md shadow-primary/20'
        }`}
      >
        {isLocked ? (
          <Lock size={28} className="text-muted-foreground" />
        ) : isCleared ? (
          <CheckCircle2 size={32} className="text-green-500" />
        ) : (
          <span className="text-3xl">{scenario.scenarioEmoji ?? '🗣️'}</span>
        )}
        {/* 순서 뱃지 */}
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            isLocked ? 'bg-border text-muted-foreground' : 'bg-primary text-white'
          }`}
        >
          {index + 1}
        </span>
      </button>

      {/* 제목 */}
      <p className={`mt-2 text-sm font-semibold ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
        {scenario.scenarioTitle}
      </p>

      {/* 인라인 확장 패널 */}
      {isExpanded && !isLocked && (
        <div className="mt-3 w-full max-w-sm rounded-2xl bg-card px-5 py-4 shadow-sm border border-border">
          <p className="mb-1 text-xs font-semibold text-primary">달성 목표</p>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{scenario.scenarioGoal}</p>
          <button
            onClick={() => onStart(scenario.scenarioId)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity"
          >
            <span>주문하러 가기</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 점선 커넥터 */}
      {!isLast && (
        <div className="my-3 flex flex-col items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-border" />
          ))}
        </div>
      )}
    </div>
  );
}
