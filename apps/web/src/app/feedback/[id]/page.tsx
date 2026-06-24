// 피드백 페이지 — 총평 카드 + 질문별 피드백을 페이지 단위로 표시
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import type { ApiTurnFeedback } from '@/lib/api';
import { useFeedbackQuery } from '@/queries/feedback';
import { useScenarioStore } from '@/store/scenarioStore';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { Button } from '@/components/ui/Button';
import { useScrollShadow } from '@/hooks/useScrollShadow';
import { track, EVENTS } from '@/lib/analytics';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const scenario = useScenarioStore((s) => s.current);
  const { header, turnFeedbacks, isDone, error } = useFeedbackQuery(Number(id));

  // 0 = 총평, 1..N = 발화별 상세
  const [page, setPage] = useState(0);

  if (!isDone || !header) {
    if (error) {
      return (
        <main className='flex h-full items-center justify-center bg-background px-6'>
          <div className='space-y-4 text-center'>
            <p className='text-muted-foreground'>{error.message}</p>
            <button onClick={() => router.replace('/home?unlocked=true')} className='text-sm font-medium text-primary'>돌아가기</button>
          </div>
        </main>
      );
    }
    return <SummarySkeleton />;
  }

  if (error || !header) {
    return (
      <main className='flex h-full items-center justify-center bg-background px-6'>
        <div className='space-y-4 text-center'>
          <p className='text-muted-foreground'>{error?.message ?? '피드백을 불러올 수 없어요.'}</p>
          <button onClick={() => router.replace('/home?unlocked=true')} className='text-sm font-medium text-primary'>돌아가기</button>
        </div>
      </main>
    );
  }


  const goodTurns = turnFeedbacks.filter((t) => t.feedbackType === 'GOOD').length;

  return (
    <AnimatePresence mode='wait' initial={false}>
      {page === 0 ? (
        <motion.div
          key='summary'
          className='h-full'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
        >
          <SummaryPage
            score={header.nativeScore}
            highlightMessage={header.highlightMessage}
            totalTurns={turnFeedbacks.length}
            goodTurns={goodTurns}
            scenarioTitle={scenario?.scenarioTitle ?? null}
            sessionId={header.sessionId}
            scenarioId={scenario?.scenarioId ?? null}
            onNext={() => { track(EVENTS.FEEDBACK_DETAIL_VIEWED, { scenario_id: scenario?.scenarioId, session_id: header.sessionId }); setPage(1); }}
          />
        </motion.div>
      ) : (
        <motion.div
          key='turns'
          className='h-full'
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TurnDetailView
            turns={turnFeedbacks}
            sessionId={header.sessionId}
            scenarioId={scenario?.scenarioId ?? null}
            onBack={() => setPage(0)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── SummarySkeleton ─────────────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200 ${className ?? ''}`} />;
}

function SummarySkeleton() {
  return (
    <div className='flex h-full flex-col bg-background' style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
      {/* 네비게이션 헤더 */}
      <div className='flex items-center justify-center px-4 pt-4 pb-2'>
        <Bone className='h-5 w-24' />
      </div>

      <div className='flex flex-1 flex-col px-6 pt-2'>
        {/* 점수 */}
        <div className='mt-3 space-y-2'>
          <Bone className='h-4 w-24' />
          <Bone className='h-10 w-52' />
        </div>

        {/* 러너 트랙 — 캐릭터 공간(104px) + 트랙 바 */}
        <div style={{ marginTop: 104 }}>
          <Bone className='h-5 w-full rounded-full' />
          <div className='flex justify-between mt-2.5'>
            <Bone className='h-4 w-28' />
            <Bone className='h-4 w-24' />
          </div>
        </div>

        {/* 이번 대화에서 섹션 */}
        <div className='mt-10 mb-4'>
          <Bone className='h-6 w-28 mb-3' />
          <div className='rounded-2xl bg-zinc-100 overflow-hidden divide-y divide-zinc-200'>
            <div className='px-5 py-4 space-y-2'>
              <Bone className='h-3 w-16' />
              <Bone className='h-5 w-48' />
            </div>
            <div className='px-5 py-4 space-y-2'>
              <Bone className='h-3 w-20' />
              <Bone className='h-5 w-40' />
            </div>
            <div className='px-5 py-4 space-y-2'>
              <Bone className='h-3 w-20' />
              <Bone className='h-5 w-56' />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className='mt-auto' style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', paddingTop: '32px' }}>
          <Bone className='h-14 w-full rounded-2xl' />
        </div>
      </div>
    </div>
  );
}

// ─── TurnDetailView ───────────────────────────────────────────────────────────

// 발화별 상세 피드백을 전체 화면으로 보여줌
// Swiper로 iOS 스타일 드래그 중 다음 카드 미리보기 구현
function TurnDetailView({
  turns, sessionId, scenarioId, onBack,
}: {
  turns: ApiTurnFeedback[]; sessionId: number; scenarioId: number | null; onBack: () => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [hasShadow, setHasShadow] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);
  const isLast = index === turns.length - 1;

  function goNext() {
    if (!isLast) swiperRef.current?.slideNext();
    else router.replace('/home?unlocked=true');
  }

  function goBack() {
    if (index > 0) swiperRef.current?.slidePrev();
    else onBack();
  }

  return (
    <div className='flex h-full flex-col bg-background' style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
      {/* 헤더 + 세그먼트 진행 바 */}
      <div
        className='shrink-0 transition-shadow duration-200'
        style={{ boxShadow: hasShadow ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}
      >
        <div className='flex items-center px-4 pt-4 pb-2'>
          <button
            onClick={goBack}
            className='flex items-center justify-center w-8 h-8 -ml-1 rounded-full text-zinc-400 active:bg-zinc-100'
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <p className='flex-1 text-center text-lg font-bold text-zinc-800 pr-7'>상세 분석</p>
        </div>
        <div className='px-4 pb-4 flex gap-1.5'>
          {turns.map((_, i) => (
            <motion.div
              key={i}
              className='flex-1 rounded-full'
              style={{ height: 3 }}
              animate={{
                backgroundColor: i <= index ? '#E07A3A' : '#E4E4E7',
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          ))}
        </div>
      </div>

      {/* 카드 콘텐츠 — Swiper로 드래그 중 양옆 카드 보임 */}
      <div className='relative flex-1 overflow-hidden'>
        <Swiper
          modules={[Keyboard]}
          keyboard={{ enabled: true }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={(swiper) => { const i = swiper.activeIndex; track(EVENTS.FEEDBACK_TURN_NAVIGATED, { scenario_id: scenarioId, session_id: sessionId, turn_index: i }); setIndex(i); setHasShadow(false); }}
          slidesPerView={1}
          spaceBetween={16}
          style={{ height: '100%' }}
          resistance
          resistanceRatio={0.65}
        >
          {turns.map((turn, i) => (
            <SwiperSlide key={i} style={{ height: '100%' }}>
              <TurnCard turn={turn} onScrollChange={setHasShadow} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* 하단 CTA — 항상 노출 (좌우 스와이프를 모르는 사용자를 위한 명시적 다음 버튼) */}
      <div
        className='px-5 pt-3 shrink-0 border-t border-zinc-100'
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
        <Button onClick={goNext}>{isLast ? '다음 대화할게요' : '다음'}</Button>
      </div>
    </div>
  );
}

// ─── SummaryPage ──────────────────────────────────────────────────────────────

// delay(ms) 후 duration(ms)동안 0→target 카운트업, ease는 게이지와 동일한 cubic
function useCountUp(target: number, delay: number, duration: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = Date.now();
      function tick() {
        const t = Math.min((Date.now() - start) / duration, 1);
        // [0.25, 0.46, 0.45, 0.94] cubic-bezier 근사 — 게이지와 동일
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        setValue(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay, duration]);
  return value;
}

function getScoreInterpretation(score: number): string {
  if (score >= 95) return '어색한 표현 하나 없이, 원어민이 완벽히 이해했어요.';
  if (score >= 90) return '원어민과 프리토킹이 가능해요.';
  if (score >= 80) return '원어민이 되묻지 않고 한 번에 알아들었어요. 사소한 실수 정도는 인간미라 괜찮아요.';
  if (score >= 70) return '살짝 어색한 표현이 있어도, 원어민이 내 의도를 알아듣는 데엔 문제 없어요.';
  if (score >= 60) return '유창하진 않아도 괜찮아요. 하고 싶은 말은 다 전달됐어요.';
  if (score >= 50) return '원어민이 아리송해하면서도 어느 정도 알아들었어요. 조금만 다듬으면 또렷하게 전달돼요.';
  if (score >= 40) return '센스 있는 원어민은 핵심을 알아차렸지만, 무심한 상대였다면 놓쳤을 거예요.';
  if (score >= 30) return '원어민이 무슨 말인지 감 정도만 잡았어요.';
  return '몸짓까지 썼다면 통했겠지만, 말만으로는 아직 어려웠어요.';
}

// RunnerTrack과 동일: delay 400ms, duration 1800ms
const TRACK_DELAY = 400;
const TRACK_DURATION = 1800;

function SummaryPage({
  score, highlightMessage, totalTurns, goodTurns, scenarioTitle, sessionId, scenarioId, onNext,
}: {
  score: number; highlightMessage: string;
  totalTurns: number; goodTurns: number; scenarioTitle: string | null;
  sessionId: number; scenarioId: number | null; onNext: () => void;
}) {
  const router = useRouter();
  const interpretation = getScoreInterpretation(score);
  const displayScore = useCountUp(score, TRACK_DELAY, TRACK_DURATION);
  const trackEndSec = (TRACK_DELAY + TRACK_DURATION) / 1000;
  const [showExitModal, setShowExitModal] = useState(false);
  const { ref: scrollRef, onScroll, hasShadow } = useScrollShadow();

  useEffect(() => {
    track(EVENTS.FEEDBACK_SUMMARY_VIEWED, { scenario_id: scenarioId, session_id: sessionId, score });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  return (
    <div className='flex h-full flex-col bg-background' style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
      {/* 네비게이션 헤더 */}
      <div
        className='flex items-center px-4 pt-4 pb-3 border-b border-zinc-200 transition-shadow duration-200'
        style={{ boxShadow: hasShadow ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}
      >
        <button
          onClick={() => setShowExitModal(true)}
          className='flex items-center justify-center w-8 h-8 -ml-1 rounded-full text-zinc-500 active:bg-zinc-100'
        >
          <ChevronLeft size={22} strokeWidth={2} className='text-zinc-400' />
        </button>
        <p className='flex-1 text-center text-lg font-bold text-zinc-800 pr-7'>{scenarioTitle ?? '피드백'}</p>
      </div>

      {/* 나가기 확인 모달 */}
      <AnimatePresence>
        {showExitModal && (
          <>
            <motion.div
              className='fixed inset-0 bg-black/40 z-40'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitModal(false)}
            />
            <motion.div
              className='fixed bottom-0 z-50 bg-white rounded-t-3xl px-6 pt-6 w-full max-w-107.5 left-1/2 -translate-x-1/2'
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
            >
              <p className='text-lg font-bold text-zinc-800 mb-1'>상세 분석을 보지 않고 나갈까요?</p>
              <p className='text-sm text-zinc-500 mb-6'>지금 안 보면 같은 실수를 또 해요.</p>
              <div className='flex flex-col gap-2'>
                <Button onClick={() => setShowExitModal(false)}>계속 볼게요</Button>
                <button
                  onClick={() => { track(EVENTS.FEEDBACK_EXITED_EARLY, { scenario_id: scenarioId, session_id: sessionId }); router.replace('/home?unlocked=true'); }}
                  className='w-full py-3 text-sm font-semibold text-zinc-400'
                >
                  그냥 나갈게요
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div ref={scrollRef} onScroll={onScroll} className='no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pt-2'>
        <motion.div
          className='mt-3'
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className='text-base text-zinc-500 mb-1'>한국인 평균보다</p>
          <p className='text-4xl font-black tracking-tight leading-tight'>
            {/* 카운트업 중 자릿수 변화로 뒤 문구가 밀리지 않게 최종 값만큼 너비 고정 */}
            <span className='relative inline-block tabular-nums text-[#E07A3A]'>
              <span className='invisible' aria-hidden>{score}%</span>
              <span className='absolute inset-0 text-right'>{displayScore}%</span>
            </span>
            <span className='text-zinc-800'> 더 잘 전달했어요</span>
          </p>
        </motion.div>

        {/* 러너 트랙 */}
        <RunnerTrack targetPos={score} />

        {/* 이번 대화에서 섹션 */}
        <motion.div
          className='mt-10 mb-4'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: trackEndSec - 0.6 }}
        >
          <p className='text-xl font-bold text-zinc-800 mb-3'>이번 대화에서</p>
          <div className='rounded-2xl bg-[#FFF4EC] divide-y divide-[#F0D9C8]'>

            {/* 전달력 */}
            <div className='px-5 py-4'>
              <p className='text-xs font-semibold text-zinc-500 mb-1'>전달력</p>
              <p className='text-base font-semibold text-zinc-800 leading-snug'>{interpretation}</p>
            </div>

            {/* 대화 성공률 */}
            <div className='px-5 py-4'>
              <p className='text-xs font-semibold text-zinc-500 mb-1'>대화 성공률</p>
              <p className='text-base font-semibold text-zinc-800 leading-snug'>
                {goodTurns > 0
                  ? <>{totalTurns}번 중 <span className='text-[#E07A3A]'>{goodTurns}번</span> 원어민처럼 말했어요</>
                  : `${totalTurns}번 모두 끝까지 말했어요.`
                }
              </p>
            </div>

            {/* 발견한 강점 */}
            {highlightMessage && (
              <div className='px-5 py-4'>
                <p className='text-xs font-semibold text-zinc-500 mb-1'>발견한 강점</p>
                <p className='text-base font-semibold text-zinc-800 leading-snug'>{highlightMessage}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <div className='mt-auto' style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', paddingTop: '32px' }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: trackEndSec - 0.4 }}
          >
            <Button onClick={onNext}>
              {(totalTurns - goodTurns) > 0
                ? `원어민까지 ${totalTurns - goodTurns}걸음, 고쳐볼게요`
                : '뭐가 잘 통했는지 볼게요'}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── RunnerTrack ──────────────────────────────────────────────────────────────

// 왼쪽=평균 한국인(0%), 오른쪽=원어민(100%)
// 캐릭터가 왼쪽(0%)에서 출발해 targetPos(%)까지 달려가며 바를 채움
function RunnerTrack({ targetPos }: { targetPos: number }) {
  const [pos, setPos] = useState(0);
  const trackColor = '#E07A3A';
  useEffect(() => {
    const t1 = setTimeout(() => setPos(targetPos), TRACK_DELAY);
    return () => clearTimeout(t1);
  }, [targetPos]);

  return (
    <div className='select-none'>

      {/* 트랙 바 */}
      <div className='relative rounded-full bg-zinc-200 overflow-visible' style={{ marginTop: 104, height: 20 }}>
        {/* 채워지는 바 */}
        <motion.div
          className='absolute left-0 top-0 h-full rounded-full'
          style={{ backgroundColor: trackColor }}
          initial={{ width: '0%' }}
          animate={{ width: `${pos}%` }}
          transition={{ duration: TRACK_DURATION / 1000, delay: TRACK_DELAY / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        {/* 왼쪽 끝 동그라미 */}
        <div className='absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full' style={{ backgroundColor: '#B8651A' }} />
        {/* 오른쪽 끝 동그라미 */}
        <div className='absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full' style={{ backgroundColor: '#C4C4C4' }} />

        {/* 캐릭터 — 채워진 바 위에 오른쪽 끝 기준으로 올라탐 */}
        <motion.div
          className='absolute top-0 h-full'
          style={{ left: 0, zIndex: 10 }}
          animate={{ width: `${pos}%` }}
          transition={{ duration: TRACK_DURATION / 1000, delay: TRACK_DELAY / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className='absolute' style={{ right: -44, bottom: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/runner.webp'
              alt='runner'
              style={{ width: 88, height: 88, objectFit: 'contain', animation: `runnerBounce 1.2s ease-in-out ${(TRACK_DELAY + TRACK_DURATION) / 1000}s infinite` }}
            />
          </div>
        </motion.div>
      </div>

      {/* 양끝 라벨 */}
      <div className='flex justify-between mt-2.5'>
        <p className='text-base font-semibold text-zinc-700'><span className='tossface'>🇰🇷</span> 아직은 한국인</p>
        <p className='text-base font-semibold text-zinc-700'>사실상 원어민 <span className='tossface'>🌍</span></p>
      </div>
    </div>
  );
}

// ─── TurnCard ─────────────────────────────────────────────────────────────────

function FadeIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function TurnCard({ turn, onScrollChange }: { turn: ApiTurnFeedback; onScrollChange?: (scrolled: boolean) => void }) {
  const isGood = turn.feedbackType === 'GOOD';

  return (
    <div
      className='no-scrollbar h-full overflow-y-auto overscroll-y-contain px-4 pt-2 space-y-5'
      style={{ paddingBottom: 32 }}
      onScroll={(e) => onScrollChange?.((e.currentTarget.scrollTop) > 0)}
    >

      {/* 타입 제목 — 결론을 맨 위에 노출 */}
      <FadeIn delay={0}>
        <p className='text-2xl font-black leading-tight text-zinc-800'>
          <span className='tossface'>{isGood ? '✅' : '💪'}</span>{' '}
          {isGood ? '잘 통했어요' : '한 단계 더 업그레이드해봐요'}
        </p>
      </FadeIn>

      {/* 채팅 UI */}
      <FadeIn delay={0.1}>
        <div>
          <p className='text-xs font-semibold text-zinc-500 mb-1.5 px-1'>질문</p>
          <AiBubble text={turn.originalQuestion} translatedText={turn.translatedQuestion} />
        </div>
      </FadeIn>
      <FadeIn delay={0.2}>
        <div>
          <p className='text-xs font-semibold text-zinc-500 mb-1.5 px-1 text-right'>내 답변</p>
          <UserBubble text={turn.userUtterance} />
        </div>
      </FadeIn>

      {/* 구분선 — 대화와 분석 사이 */}
      <div className='border-t border-zinc-100 mx-1' />

      {isGood ? (
        <>
          {turn.koreanAnalogy && (
            <FadeIn delay={0.18}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>한국어로 치면</p>
                <div className='rounded-2xl border border-zinc-200 px-4 py-4'>
                  <p className='text-base text-zinc-600 leading-relaxed'>{turn.koreanAnalogy}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {turn.feedbackDetail && (
            <FadeIn delay={0.3}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>잘한 이유</p>
                <div className='rounded-2xl border border-zinc-200 px-4 py-4'>
                  <p className='text-base text-zinc-700 leading-relaxed'>{turn.feedbackDetail}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {turn.benchmarkMessage && (
            <FadeIn delay={0.42}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-[#3B82F6]'>이 디테일이 통했어요</p>
                <div className='rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-4'>
                  <p className='text-base font-semibold text-zinc-800 leading-relaxed'>{turn.benchmarkMessage}</p>
                </div>
              </div>
            </FadeIn>
          )}
        </>
      ) : (
        <>
          {turn.koreanAnalogy && (
            <FadeIn delay={0.18}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>한국어로 치면</p>
                <div className='rounded-2xl border border-zinc-200 px-4 py-4'>
                  <p className='text-base text-zinc-600 leading-relaxed'>{turn.koreanAnalogy}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {turn.correctionExpression && (
            <FadeIn delay={0.3}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>이렇게 하면 더 통해요</p>
                <div className='rounded-2xl border border-zinc-200 px-4 py-4 space-y-3'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <p className='text-base font-semibold text-zinc-600 line-through decoration-zinc-600'>{turn.userUtterance}</p>
                    <span className='text-zinc-300 font-bold'>→</span>
                    <p className='text-base font-bold text-zinc-800'>{turn.correctionExpression}</p>
                  </div>
                  {turn.correctionReason && (
                    <p className='text-sm text-zinc-500 leading-relaxed border-t border-zinc-200 pt-3'>{turn.correctionReason}</p>
                  )}
                </div>
              </div>
            </FadeIn>
          )}

          {turn.positiveFeedback && (
            <FadeIn delay={0.42}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-[#16A34A]'>이 부분은 좋았어요</p>
                <div className='rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-4'>
                  <p className='text-base font-semibold text-zinc-800 leading-relaxed'>{turn.positiveFeedback}</p>
                </div>
              </div>
            </FadeIn>
          )}
        </>
      )}

    </div>
  );
}
