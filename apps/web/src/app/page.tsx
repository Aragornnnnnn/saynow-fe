'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ChevronRight, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SurveySheet } from '@/components/SurveySheet';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { exitApp } from '@/bridge/commands';
import type { ApiScenario, ApiCategory } from '@/lib/api';
import { useScenariosQuery } from '@/queries/scenarios';
import { prefetchSession } from '@/lib/api';
import { getScenarioImage } from '@/lib/scenarioImages';

export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = useRequireAuth();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedScenarioId, setExpandedScenarioId] = useState<number | null>(null);
  const [badgeRect, setBadgeRect] = useState<DOMRect | null>(null);
  const [showSurvey, setShowSurvey] = useState(() => searchParams.get('survey') === 'true');

  useEffect(() => {
    if (searchParams.get('survey') === 'true') {
      router.replace('/');
    }
  }, [searchParams, router]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, isPending, error, refetch } = useScenariosQuery(isReady);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  useBackButtonBridge(() => {
    if (expandedScenarioId !== null) { setExpandedScenarioId(null); return; }
    exitApp();
  });

  if (!isReady) return null;

  const categories = data?.categories ?? [];

  // 선택된 카테고리 또는 첫 번째 비잠금 카테고리
  const activeCategory: ApiCategory | undefined =
    selectedCategoryId !== null
      ? categories.find((c) => c.categoryId === selectedCategoryId)
      : categories.find((c) => !c.categoryLocked);

  // 팝오버 카드 계산값
  const expandedScenario = activeCategory?.scenarios.find((s) => s.scenarioId === expandedScenarioId) ?? null;
  const cardWidth = 280;
  const cardLeft = badgeRect ? Math.max(16, Math.min(badgeRect.left + badgeRect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - 16)) : 0;
  const cardTop = badgeRect ? badgeRect.bottom + 40 : 0;
  const arrowLeft = badgeRect ? Math.round(badgeRect.left + badgeRect.width / 2 - cardLeft) : 0;
  const cardBg = expandedScenario?.locked ? '#9CA3AF' : '#E07A3A';

  function handleCategoryChange(id: number | null) {
    setSelectedCategoryId(id);
    setExpandedScenarioId(null);
  }

  function handleBadgeClick(scenario: ApiScenario, rect: DOMRect) {
    setExpandedScenarioId((prev) => {
      if (prev === scenario.scenarioId) { setBadgeRect(null); return null; }
      setBadgeRect(rect);
      // 팝오버 열릴 때 대화/피드백 이미지 미리 로드
      (['play', 'success', 'fail'] as const).forEach((type) => {
        const img = new Image();
        img.src = getScenarioImage(scenario.scenarioId, type);
      });
      return scenario.scenarioId;
    });
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
    <main className="flex h-dvh flex-col overflow-x-hidden" style={{ background: 'linear-gradient(to bottom, #FAFAF8 50%, #E8DDD0 100%)' }}>
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
            <div className="mt-6 flex flex-col items-center px-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex w-full flex-col items-center">
                  <div className="relative">
                    <div className="h-22 w-22 skeleton rounded-full bg-card" />
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 skeleton rounded-full bg-card" />
                  </div>
                  <div className="mt-2 h-4 w-28 skeleton rounded bg-card" />
                  {i < 2 && (
                    <div className="my-3 flex flex-col items-center gap-1">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="h-1.5 w-1.5 rounded-full bg-border" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : activeCategory ? (
            <ScenarioBadgeList
              scenarios={activeCategory.scenarios.slice(0, 3)}
              expandedId={expandedScenarioId}
              onBadgeClick={(scenario, el) => handleBadgeClick(scenario, el.getBoundingClientRect())}
              onStart={(id) => { prefetchSession(id); router.push(`/conversation/${id}`); }}
            />
          ) : null}
        </div>
      </div>

      {/* fixed 팝오버 카드 */}
      <AnimatePresence initial={false}>
        {expandedScenario && badgeRect && (
          <motion.div
            key="scenario-card"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed z-50"
            style={{ top: cardTop, left: cardLeft, width: cardWidth }}
          >
            <div
              className="absolute -top-1.75 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent"
              style={{ left: arrowLeft - 8, borderBottomColor: cardBg }}
            />
            <div className="rounded-2xl px-5 py-4 shadow-lg" style={{ background: cardBg }}>
              <p className="mb-1 text-xs font-semibold text-white/70">달성 목표</p>
              <p className="mb-4 text-sm text-white leading-relaxed line-clamp-2">{expandedScenario.scenarioGoal}</p>
              {expandedScenario.locked ? (
                <button disabled className="w-full rounded-xl bg-white/20 py-3 text-sm font-semibold text-white/60 cursor-default">
                  {expandedScenario.lockReason === 'COMING_SOON' ? '준비 중' : '잠금'}
                </button>
              ) : (
                <button
                  onClick={() => { prefetchSession(expandedScenario.scenarioId); router.push(`/conversation/${expandedScenario.scenarioId}`); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-semibold text-primary active:opacity-80 transition-opacity"
                >
                  <span>시작하기</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 배경 딤 — 카드 닫기 */}
      <AnimatePresence>
        {expandedScenarioId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={() => { setExpandedScenarioId(null); setBadgeRect(null); }}
          />
        )}
      </AnimatePresence>

      {/* 서베이 */}
      <AnimatePresence>
        {showSurvey && (
          <SurveySheet onDone={() => setShowSurvey(false)} />
        )}
      </AnimatePresence>

    </main>
  );
}

interface ScenarioBadgeListProps {
  scenarios: ApiScenario[];
  expandedId: number | null;
  onBadgeClick: (scenario: ApiScenario, el: HTMLElement) => void;
  onStart: (scenarioId: number) => void;
}

function ScenarioBadgeList({ scenarios, expandedId, onBadgeClick, onStart }: ScenarioBadgeListProps) {
  return (
    <div className="relative mt-6 flex flex-col items-center px-4">
      {scenarios.map((scenario, index) => (
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
            isExpanded={expandedId === scenario.scenarioId}
            onBadgeClick={onBadgeClick}
            onStart={onStart}
          />
        </motion.div>
      ))}

      {/* 더 많은 시나리오 예고 */}
      <div className="flex flex-col items-center pb-10">
        <span className="text-4xl">☁️</span>
        <p className="mt-2 text-sm font-semibold text-foreground">더 많은 시나리오가 곧 공개돼요</p>
      </div>
    </div>
  );
}

interface ScenarioBadgeItemProps {
  scenario: ApiScenario;
  index: number;
  isExpanded: boolean;
  onBadgeClick: (scenario: ApiScenario, el: HTMLElement) => void;
  onStart: (scenarioId: number) => void;
}

function ScenarioBadgeItem({ scenario, index, isExpanded, onBadgeClick }: ScenarioBadgeItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const isLocked = scenario.locked;
  const isCleared = scenario.cleared;
  const isComingSoon = scenario.lockReason === 'COMING_SOON';

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
              ? `bg-[#E0E0DC] text-muted-foreground ${isExpanded ? 'shadow-[0_2px_0_#9ca3af] translate-y-1' : 'shadow-[0_6px_0_#9ca3af] active:shadow-[0_2px_0_#9ca3af] active:translate-y-1'}`
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
      <div className="my-3 flex flex-col items-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full bg-border" />
        ))}
      </div>
    </>
  );
}
