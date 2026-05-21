'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, ChevronRight, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function handleBadgeClick(scenario: ApiScenario, el: HTMLElement) {
    setExpandedScenarioId((prev) => (prev === scenario.scenarioId ? null : scenario.scenarioId));
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    <main className="flex h-dvh flex-col overflow-x-hidden" style={{ background: 'linear-gradient(to bottom, #FAFAF8 60%, #E0F2F1 100%)' }}>
      {/* 헤더 */}
      <div className="px-4 pb-3 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">SayNow</h1>
          <Link href="/me" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            내 정보
          </Link>
        </div>
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategoryId ?? activeCategory?.categoryId ?? null}
          onChange={handleCategoryChange}
        />
      </div>

      {/* 시나리오 목록 */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="no-scrollbar h-full overflow-y-auto overscroll-y-contain"
          style={{ scrollBehavior: 'smooth' }}
          onScroll={() => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(() => setExpandedScenarioId(null), 150);
          }}
          onClick={(e) => { if (e.target === scrollRef.current) setExpandedScenarioId(null); }}
        >
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
            />
          ) : null}
        </div>
        {/* 하단 그라데이션 */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background to-transparent" />

        {/* 시나리오 카드 — 그라데이션 위에 떠있음 */}
        <AnimatePresence initial={false}>
          {expandedScenarioId !== null && activeCategory && (() => {
            const scenario = activeCategory.scenarios.find((s) => s.scenarioId === expandedScenarioId);
            if (!scenario) return null;
            const isComingSoon = scenario.lockReason === 'COMING_SOON';
            return (
              <motion.div
                key="scenario-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute bottom-4 left-4 right-4 z-10"
              >
                <div className="rounded-2xl bg-card shadow-lg border border-border px-5 py-4">
                  <p className="mb-1 text-base font-bold text-foreground">{scenario.scenarioTitle}</p>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{scenario.scenarioGoal}</p>
                  {scenario.locked ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-muted py-3 text-sm font-semibold text-muted-foreground cursor-default"
                    >
                      {isComingSoon ? '준비 중' : '잠금'}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/conversation/${scenario.scenarioId}`)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity"
                    >
                      <span>{scenario.scenarioTitle} 하러 가기</span>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

    </main>
  );
}

interface ScenarioBadgeListProps {
  scenarios: ApiScenario[];
  expandedId: number | null;
  onBadgeClick: (scenario: ApiScenario, el: HTMLElement) => void;
}

const MVP_LIMIT = 3;

function ScenarioBadgeList({ scenarios, expandedId, onBadgeClick }: ScenarioBadgeListProps) {
  const visible = scenarios.slice(0, MVP_LIMIT);
  const hasMore = scenarios.length > MVP_LIMIT;

  return (
    <div className="relative mt-6 flex flex-col items-center px-4">
      {visible.map((scenario, index) => (
        <motion.div
          key={scenario.scenarioId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.35, ease: 'easeOut' }}
          className="flex w-full flex-col items-center"
        >
          <ScenarioBadgeItem
            scenario={scenario}
            index={index}
            isLast={index === visible.length - 1}
            isExpanded={expandedId === scenario.scenarioId}
            onBadgeClick={onBadgeClick}
          />
        </motion.div>
      ))}

      {/* 더 많은 시나리오 예고 */}
      {hasMore && (
        <div className="-mx-4 w-[calc(100%+2rem)] flex flex-col items-center" style={{ minHeight: '30vh' }}>
          <div className="flex flex-col items-center gap-1 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-border" />
            ))}
          </div>
          <span className="text-4xl">☁️</span>
          <p className="mt-2 text-sm font-semibold text-foreground">더 많은 시나리오가 곧 공개돼요</p>
        </div>
      )}
    </div>
  );
}

interface ScenarioBadgeItemProps {
  scenario: ApiScenario;
  index: number;
  isLast: boolean;
  isExpanded: boolean;
  onBadgeClick: (scenario: ApiScenario, el: HTMLElement) => void;
}

function ScenarioBadgeItem({ scenario, index, isLast, isExpanded, onBadgeClick }: ScenarioBadgeItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const isLocked = scenario.locked;
  const isCleared = scenario.cleared;
  const isComingSoon = scenario.lockReason === 'COMING_SOON' || index >= 3;

  return (
    <>
      {/* 뱃지 버튼 */}
      <button
        ref={ref}
        onClick={() => onBadgeClick(scenario, ref.current!)}
        style={{ width: 88, height: 88 }}
        className={`relative flex items-center justify-center rounded-full transition-all duration-150 ${
          isComingSoon
            ? 'bg-card shadow-md cursor-default overflow-hidden'
            : isLocked
              ? 'bg-card shadow-md text-muted-foreground cursor-default'
              : isCleared
                ? `bg-[#FFF4ED] ring-1 ring-primary/10 ${isExpanded ? 'shadow-[0_2px_0_#e8b48e] translate-y-1' : 'shadow-[0_6px_0_#e8b48e] active:shadow-[0_2px_0_#e8b48e] active:translate-y-1'}`
                : `bg-[#FFF4ED] ring-1 ring-primary/10 ${isExpanded ? 'shadow-[0_2px_0_#e8b48e] translate-y-1' : 'shadow-[0_6px_0_#e8b48e] active:shadow-[0_2px_0_#e8b48e] active:translate-y-1'}`
        }`}
      >
        {isComingSoon ? (
          <>
            {/* 이모지를 흐릿하게 배경으로 */}
            <span className="tossface text-3xl opacity-20 blur-[2px]">{scenario.scenarioEmoji ?? '🗣️'}</span>
            {/* 구름 오버레이 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-card/60">
              <span className="text-xl leading-none">☁️</span>
              <span className="text-[9px] font-bold text-muted-foreground/70">준비 중</span>
            </div>
          </>
        ) : isLocked ? (
          <>
            <span className="tossface text-3xl opacity-40">{scenario.scenarioEmoji ?? '🗣️'}</span>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-card/60">
              <Lock size={22} className="text-muted-foreground" />
            </div>
          </>
        ) : (
          <span className="tossface text-3xl">{scenario.scenarioEmoji ?? '🗣️'}</span>
        )}
        {/* 순서 뱃지 */}
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            isLocked ? 'bg-border text-muted-foreground' : 'bg-primary text-white'
          }`}
        >
          {isCleared ? '✓' : index + 1}
        </span>
      </button>

      {/* 제목 */}
      <p className={`mt-2 text-sm font-semibold ${isComingSoon ? 'text-muted-foreground/50' : isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
        {isComingSoon ? '???' : scenario.scenarioTitle}
      </p>


      {/* 점선 커넥터 */}
      {!isLast && (
        <div className="my-3 flex flex-col items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-border" />
          ))}
        </div>
      )}
    </>
  );
}
