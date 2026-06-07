// 피드백 페이지 — 총평 카드 + 질문별 피드백을 페이지 단위로 표시
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import type { ApiTurnFeedback } from '@/lib/api';
import { useFeedbackQuery } from '@/queries/feedback';
import { useScenarioStore } from '@/store/scenarioStore';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { Button } from '@/components/ui/Button';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const scenario = useScenarioStore((s) => s.current);
  const { header, turnFeedbacks, isDone, error } = useFeedbackQuery(Number(id));

  const [page, setPage] = useState(0);
  const totalPages = 1 + turnFeedbacks.length;

  if (!isDone || !header) {
    if (error) {
      return (
        <main className='flex h-full items-center justify-center bg-background px-6'>
          <div className='space-y-4 text-center'>
            <p className='text-muted-foreground'>{error.message}</p>
            <button onClick={() => router.replace('/')} className='text-sm font-medium text-primary'>
              돌아가기
            </button>
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
          <button onClick={() => router.replace('/')} className='text-sm font-medium text-primary'>
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  const passed = header.nativeScore >= 70;
  const goodTurns = turnFeedbacks.filter((t) => t.feedbackType === 'GOOD').length;

  function goNext() {
    if (page < totalPages - 1) setPage((p) => p + 1);
    else router.replace(`/?survey=true&sessionId=${header!.sessionId}`);
  }

  function goPrev() {
    if (page > 0) setPage((p) => p - 1);
  }

  return (
    <PagedView page={page} totalPages={totalPages} onNext={goNext} onPrev={goPrev}>
      {page === 0 ? (
        <SummaryPage
          score={header.nativeScore}
          passed={passed}
          highlightMessage={header.highlightMessage}
          totalTurns={turnFeedbacks.length}
          goodTurns={goodTurns}
          scenarioTitle={scenario?.scenarioTitle ?? null}
          onNext={goNext}
        />
      ) : (
        <TurnPage
          turn={turnFeedbacks[page - 1]}
          index={page - 1}
          totalTurns={turnFeedbacks.length}
          onNext={goNext}
          isLast={page === totalPages - 1}
        />
      )}
    </PagedView>
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

// ─── PagedView ────────────────────────────────────────────────────────────────

function PagedView({
  page, totalPages, onNext, onPrev, children,
}: {
  page: number; totalPages: number; onNext: () => void; onPrev: () => void; children: React.ReactNode;
}) {
  const dragX = useMotionValue(0);

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x < -60 || info.velocity.x < -300) onNext();
    else if (info.offset.x > 60 || info.velocity.x > 300) onPrev();
    dragX.set(0);
  }

  return (
    <div className='flex h-full flex-col bg-background'>
      <motion.div className='flex-1 overflow-hidden' drag='x' dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} onDragEnd={handleDragEnd} style={{ x: dragX }}>
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={page}
            className='h-full'
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
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
  if (score >= 90) return '외국인이 모든 말을 이해했어요';
  if (score >= 70) return '외국인이 대부분 이해했어요';
  if (score >= 50) return '외국인이 절반 이상 이해했어요';
  if (score >= 30) return '외국인이 맥락을 파악했어요';
  return '외국인이 상황을 감지했어요';
}

// RunnerTrack과 동일: delay 400ms, duration 1800ms
const TRACK_DELAY = 400;
const TRACK_DURATION = 1800;

function SummaryPage({
  score, passed, highlightMessage, totalTurns, goodTurns, scenarioTitle, onNext,
}: {
  score: number; passed: boolean; highlightMessage: string;
  totalTurns: number; goodTurns: number; scenarioTitle: string | null; onNext: () => void;
}) {
  const interpretation = getScoreInterpretation(score);
  const displayScore = useCountUp(score, TRACK_DELAY, TRACK_DURATION);
  const trackEndSec = (TRACK_DELAY + TRACK_DURATION) / 1000;

  const turnStat = goodTurns > 0
    ? `${totalTurns}번 대화 중 ${goodTurns}번 잘 통했어요`
    : `${totalTurns}번 모두 끝까지 도전했어요`;

  return (
    <div className='flex h-full flex-col bg-background' style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
      {/* 네비게이션 헤더 */}
      <div className='flex items-center justify-center px-4 pt-4 pb-2'>
        <p className='text-base font-semibold text-zinc-800'>{scenarioTitle ?? '피드백'}</p>
      </div>

      <div className='flex flex-1 flex-col px-6 pt-2'>
        <motion.div
          className='mt-3'
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className='text-base text-zinc-500 mb-1'>한국인 평균보다</p>
          <p className='text-4xl font-black tracking-tight leading-tight'>
            <span className='text-[#E07A3A]'>{displayScore}%</span>
            <span className='text-zinc-800'> 더 잘 전달했어요</span>
          </p>
        </motion.div>

        {/* 러너 트랙 */}
        <RunnerTrack targetPos={score} passed={passed} />

        {/* 이번 대화에서 섹션 */}
        <motion.div
          className='mt-10 mb-4'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: trackEndSec + 0.2 }}
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
                  ? <>{totalTurns}번 중 <span className='text-[#E07A3A]'>{goodTurns}번</span> 잘 통했어요</>
                  : turnStat
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
          {(totalTurns - goodTurns) > 0 && (
            <motion.div
              className='text-center mb-3'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: trackEndSec + 0.6 }}
            >
              <p
                className='text-base font-medium text-zinc-800'
                style={{ animation: `runnerBounce 1.2s ease-in-out ${trackEndSec}s infinite` }}
              >
                조금만 다듬으면 바로 통하는 표현이 있어요 <span className='tossface'>👇</span>
              </p>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: trackEndSec + 0.4 }}
          >
            <Button onClick={onNext}>상세 분석 보러 갈게요</Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── RunnerTrack ──────────────────────────────────────────────────────────────

// 왼쪽=평균 한국인(0%), 오른쪽=원어민(100%)
// 캐릭터가 왼쪽(0%)에서 출발해 targetPos(%)까지 달려가며 바를 채움
function RunnerTrack({ targetPos, passed }: { targetPos: number; passed: boolean }) {
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
              src='/runner.png'
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

// ─── TurnPage ─────────────────────────────────────────────────────────────────

function TurnPage({
  turn, index, totalTurns, onNext, isLast,
}: {
  turn: ApiTurnFeedback; index: number; totalTurns: number; onNext: () => void; isLast: boolean;
}) {
  const isGood = turn.feedbackType === 'GOOD';

  return (
    <div className='flex h-full flex-col'>
      <div className='no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 space-y-3'>
        <p className='text-xs text-muted-foreground font-medium'>{index + 1} / {totalTurns}</p>

        <AiBubble text={turn.originalQuestion} translatedText={turn.translatedQuestion} />

        <UserBubble text={turn.userUtterance}>
          {isGood && <p className='text-xs font-semibold text-green-600'>✓ 잘했어요</p>}
        </UserBubble>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className='flex flex-col items-end gap-2'
        >
          {/* 외국인 귀에는 / 개선 포인트 */}
          {turn.feedbackDetail && (
            <div className={`rounded-2xl rounded-tr-none px-4 py-3 max-w-[88%] space-y-1 ${isGood ? 'bg-green-50 border border-green-200' : 'bg-zinc-100'}`}>
              <p className={`text-[11px] font-semibold tracking-wide ${isGood ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isGood ? '✨ 잘한 이유' : '🎧 외국인 귀에는'}
              </p>
              <p className='text-sm font-semibold text-foreground leading-snug'>{turn.feedbackDetail}</p>
              {turn.koreanAnalogy && (
                <p className='text-xs text-muted-foreground leading-relaxed'>{turn.koreanAnalogy}</p>
              )}
            </div>
          )}

          {/* NEEDS_IMPROVEMENT의 잘한 포인트 */}
          {!isGood && turn.positiveFeedback && (
            <div className='rounded-2xl rounded-tr-none bg-green-50 border border-green-200 px-4 py-3 max-w-[88%] space-y-1'>
              <p className='text-[11px] font-semibold text-green-600 tracking-wide'>👍 잘한 점</p>
              <p className='text-sm text-green-700 leading-snug'>{turn.positiveFeedback}</p>
            </div>
          )}

          {/* benchmarkMessage */}
          {turn.benchmarkMessage && (
            <div className='rounded-2xl rounded-tr-none bg-blue-50 border border-blue-200 px-4 py-3 max-w-[88%]'>
              <p className='text-xs font-semibold text-blue-600 leading-snug'>{turn.benchmarkMessage}</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className='px-4 pt-3 border-t border-border' style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <Button onClick={onNext}>{isLast ? '홈으로 가기' : '다음 보기'}</Button>
      </div>
    </div>
  );
}
