'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { exitApp } from '@/bridge/commands';
import { Button } from '@/components/ui/Button';
import { FeedbackButton } from '@/components/FeedbackButton';
import { toast } from '@/components/ui/Toast';
import type { ApiScenario } from '@/lib/api';
import { useScenariosQuery } from '@/queries/scenarios';
import { prefetchSession } from '@/lib/api';
import { getScenarioImage } from '@/lib/scenarioImages';
import { useScenarioStore } from '@/store/scenarioStore';
import { useAuthStore } from '@/store/authStore';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { track, EVENTS } from '@/lib/analytics';

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
  const member = useAuthStore((s) => s.member);
  const [isRedirectingToOnboarding, setIsRedirectingToOnboarding] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperInstanceRef = useRef<SwiperType | null>(null);
  const allCompletedFiredRef = useRef(false);
  const isUnlockMode = searchParams.get('unlocked') === 'true';
  const [unlockedCardIndex, setUnlockedCardIndex] = useState<number | null>(null);
  const { data, isPending, error, refetch } = useScenariosQuery(_hasHydrated && !!refreshToken);
  const setScenario = useScenarioStore((s) => s.setScenario);

  useBackButtonBridge(() => exitApp());

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') swiperInstanceRef.current?.slideNext();
      if (e.key === 'ArrowUp') swiperInstanceRef.current?.slidePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!isReady || !shouldShowOnboarding(member)) return;
    setIsRedirectingToOnboarding(true);
    router.replace('/onboarding');
  }, [isReady, member, router]);

  useEffect(() => {
    if (!isUnlockMode || isPending || !data) return;
    const scenarios = data.categories.find((c) => !c.categoryLocked)?.scenarios.slice(0, 3) ?? [];
    // 잠기지 않은 카드 중 가장 마지막 — 방금 해금된 카드
    const unlockedIndex = scenarios.reduce((last, s, i) => (!s.locked ? i : last), -1);
    if (unlockedIndex <= 0) return; // 0이면 1번만 해금된 것 — 애니메이션 불필요
    swiperInstanceRef.current?.slideTo(0, 0);
    setActiveIndex(0);
    setUnlockedCardIndex(unlockedIndex);
    const timer = setTimeout(() => {
      swiperInstanceRef.current?.slideTo(unlockedIndex, 600);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isUnlockMode, isPending, data]);

  const categories = data?.categories ?? [];
  const activeCategory = categories.find((c) => !c.categoryLocked);
  const scenarios = activeCategory?.scenarios.slice(0, 3) ?? [];
  const allCompleted = scenarios.length > 0 && scenarios.every((s) => s.completed);

  useEffect(() => {
    if (allCompleted && activeIndex === scenarios.length && !allCompletedFiredRef.current) {
      allCompletedFiredRef.current = true;
      track(EVENTS.ALL_SCENARIOS_COMPLETED);
    }
  }, [allCompleted, activeIndex, scenarios.length]);

  useEffect(() => {
    if (isReady && !shouldShowOnboarding(member)) track(EVENTS.SCENARIO_LIST_VIEWED);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  if (!isReady || isRedirectingToOnboarding) return null;

  function handleStart(scenario: ApiScenario) {
    if (scenario.locked) return;
    track(EVENTS.SCENARIO_STARTED, { scenario_id: scenario.scenarioId, is_retry: scenario.completed });
    setScenario({
      scenarioId: scenario.scenarioId,
      scenarioTitle: scenario.scenarioTitle,
      briefing: scenario.briefing,
      conversationGoal: scenario.conversationGoal,
      scenarioEmoji: scenario.scenarioEmoji ?? null,
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

  const totalDots = scenarios.length + 1;

  return (
    <motion.main
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ background: '#F2F2F7' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-5 z-20 flex-shrink-0 bg-background"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 8, borderBottom: '1px solid #ebebeb' }}
      >
        <div className="flex items-center gap-2">
          <span className="tossface text-[22px] leading-none">🗂️</span>
          <span className="text-[17px] font-semibold" style={{ color: '#111' }}>대화 목록</span>
        </div>
        <div className="flex items-center">
          <FeedbackButton />
          <Link href="/me" onClick={() => track(EVENTS.MY_PAGE_VIEWED)} className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-all active:scale-90 active:bg-zinc-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: '#888' }}>내 정보</span>
          </Link>
        </div>
      </div>

      {/* 수직 인디케이터 */}
      {!isPending && scenarios.length > 0 && (
        <div className="absolute right-1.5 top-1/2 z-20 flex flex-col items-center gap-1.5 -translate-y-1/2">
          {Array.from({ length: totalDots }).map((_, i) => {
            const isLast = i === totalDots - 1;
            const isActive = i === activeIndex;
            const lockColor = isActive ? '#111' : '#ccc';
            if (isLast && !allCompleted) {
              return (
                <svg key={i} width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <rect x="1" y="4.5" width="8" height="7" rx="1.5" fill={lockColor} />
                  <path d="M3 4.5V3a2 2 0 1 1 4 0v1.5" stroke={lockColor} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              );
            }
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: 6,
                  height: isActive ? 20 : 6,
                  background: isActive ? '#111' : '#ccc',
                }}
              />
            );
          })}
        </div>
      )}

      {/* 시나리오 목록 */}
      <div className="relative flex-1 overflow-hidden">
        {isPending ? (
          <div style={{ height: 'calc(100% - 80px)', marginTop: 40, padding: '14px 28px 14px 20px', boxSizing: 'border-box' }}>
            <div className="w-full h-full rounded-[20px] overflow-hidden bg-card shadow-md flex flex-col">
              <div className="skeleton bg-border" style={{ flex: 2, minHeight: 0 }} />
              <div className="px-5 pt-5 pb-5 flex flex-col gap-3" style={{ flex: 1, minHeight: 0 }}>
                <div className="skeleton h-7 w-48 rounded-lg bg-border" />
                <div className="skeleton h-5 w-full rounded-lg bg-border" />
                <div className="skeleton h-5 w-2/3 rounded-lg bg-border" />
                <div className="skeleton h-14 w-full rounded-2xl bg-border mt-auto" />
              </div>
            </div>
          </div>
        ) : activeCategory ? (
          <Swiper
            direction="vertical"
            slidesPerView={1}
            spaceBetween={0}

            style={{ height: 'calc(100% - 40px)', marginTop: 20, overflow: 'visible' }}
            onSwiper={(swiper) => { swiperInstanceRef.current = swiper; }}
            onSlideChange={(swiper: SwiperType) => setActiveIndex(swiper.activeIndex)}
          >
            {scenarios.map((scenario, index) => (
              <SwiperSlide key={scenario.scenarioId}>
                <div style={{ padding: '8px 28px 8px 20px', height: '100%', boxSizing: 'border-box' }}>
                  <motion.div
                    style={{ height: '100%' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ScenarioCard scenario={scenario} onStart={handleStart} isUnlocking={unlockedCardIndex === index} />
                  </motion.div>
                </div>
              </SwiperSlide>
            ))}

            <SwiperSlide style={{ height: 'calc(100% + 80px)' }}>
              <div className="flex flex-col items-center justify-center h-full gap-4">
                {allCompleted ? (
                  <>
                    <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif" alt="🎉" style={{ width: 120, height: 120 }} />
                    <div className="text-center px-6">
                      <p className="text-[26px] font-extrabold leading-snug" style={{ color: '#222' }}>세 상황을 모두 해보셨네요!</p>
                      <p className="text-[18px] font-medium mt-3" style={{ color: '#888' }}>더 많은 상황으로 곧 찾아올게요!</p>
                    </div>
                  </>
                ) : (
                  <>
                    <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/2753/512.gif" alt="❓" style={{ width: 120, height: 120 }} />
                    <div className="text-center px-6">
                      <p className="text-[26px] font-extrabold leading-snug" style={{ color: '#222' }}>다음 상황이 기다리고 있어요</p>
                      <p className="text-[18px] font-medium mt-3" style={{ color: '#888' }}>먼저 세 개의 대화를 모두 끝내보세요!</p>
                    </div>
                  </>
                )}
              </div>
            </SwiperSlide>
          </Swiper>
        ) : null}
      </div>

    </motion.main>
  );
}

function ScenarioCard({ scenario, onStart, isUnlocking = false }: { scenario: ApiScenario; onStart: (s: ApiScenario) => void; isUnlocking?: boolean }) {
  const isLocked = scenario.locked;
  const isComingSoon = scenario.lockReason === 'COMING_SOON';
  const isCompleted = scenario.completed;
  // 해금 애니메이션: isUnlocking이면 잠긴 상태(흑백)로 시작해서 컬러로 전환
  const [showAsUnlocked, setShowAsUnlocked] = useState(false);
  useEffect(() => {
    if (!isUnlocking) return;
    const t = setTimeout(() => setShowAsUnlocked(true), 300);
    return () => clearTimeout(t);
  }, [isUnlocking]);
  const appearLocked = isLocked && !(isUnlocking && showAsUnlocked);

  return (
    <div className="w-full h-full flex flex-col rounded-[20px] bg-card shadow-md overflow-hidden">
      {/* 이미지 섹션 */}
      <div className="relative overflow-hidden" style={{ flex: 1, minHeight: 0, background: '#2a2a2a' }}>
        <img
          src={getScenarioImage(scenario.scenarioId)}
          alt={scenario.scenarioTitle}
          className="w-full h-full object-cover"
          style={{ filter: appearLocked ? 'grayscale(100%) brightness(0.7)' : 'grayscale(0%) brightness(1)', transition: isUnlocking ? 'filter 1s ease' : 'filter 0.5s ease' }}
        />
        {isCompleted && (
          <div className="absolute top-3 right-3 rounded-full p-1.5" style={{ background: '#22c55e' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {isComingSoon && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
            <span className="text-3xl">☁️</span>
            <span className="text-sm font-bold text-white">준비 중이에요</span>
          </div>
        )}
      </div>

      {/* 텍스트 + CTA */}
      <div className="flex flex-col gap-3 px-5 pt-4 pb-5" style={{ flex: 'none' }}>
        <div>
          <p className={`text-[20px] font-extrabold leading-snug ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
            {isComingSoon ? '???' : scenario.scenarioTitle}
          </p>
          {!isComingSoon && scenario.briefing && (
            <p className="mt-2 text-[14px] font-medium text-muted-foreground leading-relaxed line-clamp-2">
              {scenario.briefing}
            </p>
          )}
        </div>
        <div>
          {isLocked ? (
            <div
              onClick={() => { track(EVENTS.SCENARIO_LOCKED_TAPPED, { scenario_id: scenario.scenarioId, lock_reason: scenario.lockReason?.toLowerCase() ?? 'unknown' }); toast('앞선 시나리오를 먼저 클리어해봐요!'); }}
              className="flex w-full h-14 items-center justify-center gap-1.5 rounded-2xl text-base font-bold cursor-pointer"
              style={{ background: '#EBEBEA', color: '#AAAAAA' }}
            >
              잠겨있어요&nbsp;<Lock size={16} />
            </div>
          ) : (
            <Button
              onClick={() => onStart(scenario)}
              variant={isCompleted ? 'secondary' : 'primary'}
            >
              {isCompleted ? <>다시 해볼게요&nbsp;<ArrowRight size={16} /></> : <>시작할게요&nbsp;<ArrowRight size={16} /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
