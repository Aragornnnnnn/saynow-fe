'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, UserRound } from 'lucide-react';
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
import { useScenarioStore } from '@/store/scenarioStore';
import { useAuthStore } from '@/store/authStore';

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
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showSurvey, setShowSurvey] = useState(() => searchParams.get('survey') === 'true');
  const [surveySessionId] = useState(() =>
    searchParams.get('survey') === 'true' ? Number(searchParams.get('sessionId')) || null : null
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // hydration 완료 + refreshToken 확인 즉시 쿼리 시작 — isReady(accessToken 발급 완료)까지 기다리지 않음
  const { data, isPending, error, refetch } = useScenariosQuery(_hasHydrated && !!refreshToken);
  const setScenario = useScenarioStore((s) => s.setScenario);

  // 이전 데이터와 비교해서 새로 unlock된 시나리오 ID 세트 계산
  const prevDataRef = useRef(data);
  const [newlyUnlockedIds, setNewlyUnlockedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    const prev = prevDataRef.current;
    prevDataRef.current = data;
    if (!prev || !data) return;
    const prevLocked = new Set(
      prev.categories.flatMap((c) => c.scenarios.filter((s) => s.locked).map((s) => s.scenarioId))
    );
    const nowUnlocked = data.categories
      .flatMap((c) => c.scenarios)
      .filter((s) => !s.locked && prevLocked.has(s.scenarioId))
      .map((s) => s.scenarioId);
    if (nowUnlocked.length > 0) {
      setNewlyUnlockedIds(new Set(nowUnlocked));
      setTimeout(() => setNewlyUnlockedIds(new Set()), 2000);
    }
  }, [data]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  useBackButtonBridge(() => exitApp());

  if (!isReady) return null;

  const categories = data?.categories ?? [];

  // 선택된 카테고리 또는 첫 번째 비잠금 카테고리
  const activeCategory: ApiCategory | undefined =
    selectedCategoryId !== null
      ? categories.find((c) => c.categoryId === selectedCategoryId)
      : categories.find((c) => !c.categoryLocked);

  function handleCategoryChange(id: number | null) {
    setSelectedCategoryId(id);
  }

  function handleStart(scenario: ApiScenario) {
    if (scenario.locked) return;
    setScenario({
      scenarioId: scenario.scenarioId,
      scenarioTitle: scenario.scenarioTitle,
      scenarioSituation: scenario.scenarioSituation,
      scenarioGoal: scenario.scenarioGoal,
      scenarioEmoji: scenario.scenarioEmoji,
    });
    (['play', 'success', 'fail'] as const).forEach((type) => {
      const img = new Image();
      img.src = getScenarioImage(scenario.scenarioId, type);
    });
    prefetchSession(scenario.scenarioId);
    router.push(`/conversation/${scenario.scenarioId}`);
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
    <motion.main
      className="flex h-dvh flex-col overflow-x-hidden"
      style={{ background: 'linear-gradient(to bottom, #FAFAF8 50%, #E8DDD0 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
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
        {/* 공항 배경 이미지 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/background1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 0.32,
          filter: 'sepia(8%) brightness(1.02)',
          pointerEvents: 'none',
        }} />
        <div
          ref={scrollRef}
          className="no-scrollbar relative z-10 h-full overflow-y-auto overscroll-y-contain"
          style={{ scrollBehavior: 'smooth' }}
          onScroll={() => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(() => {}, 150);
          }}
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
              newlyUnlockedIds={newlyUnlockedIds}
              onStart={handleStart}
            />
          ) : null}
        </div>
      </div>

      {/* 서베이 */}
      <AnimatePresence>
        {showSurvey && (
          <SurveySheet sessionId={surveySessionId} onDone={() => { setShowSurvey(false); router.replace('/'); }} />
        )}
      </AnimatePresence>

    </motion.main>
  );
}

interface ScenarioBadgeListProps {
  scenarios: ApiScenario[];
  newlyUnlockedIds: Set<number>;
  onStart: (scenario: ApiScenario) => void;
}

function ScenarioBadgeList({ scenarios, newlyUnlockedIds, onStart }: ScenarioBadgeListProps) {
  return (
    <div className="relative mt-16 flex flex-col items-center px-4">
      {scenarios.map((scenario, index) => (
        <motion.div
          key={scenario.scenarioId}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full flex-col items-center"
        >
          <ScenarioBadgeItem
            scenario={scenario}
            isNewlyUnlocked={newlyUnlockedIds.has(scenario.scenarioId)}
            onStart={onStart}
          />
        </motion.div>
      ))}

      {/* 더 많은 시나리오 예고 */}
      {(() => {
        const allCleared = scenarios.every((s) => s.cleared);
        return (
          <div className="flex flex-col items-center pb-10">
            <span className={`text-4xl transition-opacity duration-500 ${allCleared ? 'opacity-100' : 'opacity-40'}`}>☁️</span>
            <p className={`mt-2 text-sm font-semibold transition-opacity duration-500 ${allCleared ? 'opacity-100' : 'opacity-40'}`}
              style={{ color: '#111111', textShadow: '0 1px 4px rgba(251,251,250,0.9), 0 0 8px rgba(251,251,250,0.7)' }}>
              더 많은 시나리오가 곧 공개돼요
            </p>
          </div>
        );
      })()}
    </div>
  );
}

interface ScenarioBadgeItemProps {
  scenario: ApiScenario;
  isNewlyUnlocked: boolean;
  onStart: (scenario: ApiScenario) => void;
}

// 잠금 해제됐지만 아직 클리어 안 한 첫 번째 시나리오인지 판단하는 헬퍼
function isNextTarget(scenario: ApiScenario): boolean {
  return !scenario.locked && !scenario.cleared && scenario.lockReason === null;
}

function ScenarioBadgeItem({ scenario, isNewlyUnlocked, onStart }: ScenarioBadgeItemProps) {
  const isLocked = scenario.locked;
  const isCleared = scenario.cleared;
  const isComingSoon = scenario.lockReason === 'COMING_SOON';
  const isTarget = isNextTarget(scenario);

  // unlock 애니메이션: 자물쇠가 열리면 잠깐 lock 아이콘을 보여주다가 이모지로 전환
  const [showUnlockAnim, setShowUnlockAnim] = useState(false);
  useEffect(() => {
    if (isNewlyUnlocked) {
      setShowUnlockAnim(true);
      const t = setTimeout(() => setShowUnlockAnim(false), 1800);
      return () => clearTimeout(t);
    }
  }, [isNewlyUnlocked]);

  return (
    <>
      {/* 뱃지 버튼 */}
      <button
        onClick={() => onStart(scenario)}
        style={{ width: 88, height: 88 }}
        className={`relative flex items-center justify-center rounded-full transition-all duration-150 ${
          isComingSoon
            ? 'bg-card shadow-md cursor-default overflow-hidden'
            : isLocked
              ? 'bg-[#E0E0DC] text-muted-foreground shadow-[0_6px_0_#9ca3af] active:shadow-[0_2px_0_#9ca3af] active:translate-y-1'
              : isCleared
                ? 'bg-[#FFF4ED] ring-1 ring-primary/10 overflow-hidden shadow-[0_6px_0_#e8b48e] active:shadow-[0_2px_0_#e8b48e] active:translate-y-1'
                : isTarget
                  ? 'bg-[#FFF4ED] ring-1 ring-primary/10 badge-shimmer overflow-hidden shadow-[0_6px_0_#e8b48e] active:shadow-[0_2px_0_#e8b48e] active:translate-y-1'
                  : 'bg-[#FFF4ED] ring-1 ring-primary/10 shadow-[0_6px_0_#e8b48e] active:shadow-[0_2px_0_#e8b48e] active:translate-y-1'
        }`}
      >
        {isComingSoon ? (
          <>
            <span className="tossface text-3xl opacity-20 blur-[2px]">{scenario.scenarioEmoji ?? '🗣️'}</span>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-card/60">
              <span className="text-xl leading-none">☁️</span>
              <span className="text-[9px] font-bold text-muted-foreground/70">준비 중</span>
            </div>
          </>
        ) : isLocked && !showUnlockAnim ? (
          <>
            <span className="tossface text-3xl opacity-40">{scenario.scenarioEmoji ?? '🗣️'}</span>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-card/60">
              <Lock size={22} className="text-muted-foreground" />
            </div>
          </>
        ) : showUnlockAnim ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="unlock"
              className="flex flex-col items-center justify-center"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}
            >
              <span className="tossface text-3xl">{scenario.scenarioEmoji ?? '🗣️'}</span>
            </motion.div>
          </AnimatePresence>
        ) : (
          <span className="tossface text-3xl">{scenario.scenarioEmoji ?? '🗣️'}</span>
        )}
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
