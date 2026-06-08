// 피드백 페이지 — 총평 카드 + 질문별 피드백을 페이지 단위로 표시
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
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

  // 0 = 총평, 1..N = 발화별 상세
  const [page, setPage] = useState(0);

  if (!isDone || !header) {
    if (error) {
      return (
        <main className='flex h-full items-center justify-center bg-background px-6'>
          <div className='space-y-4 text-center'>
            <p className='text-muted-foreground'>{error.message}</p>
            <button onClick={() => router.replace('/?unlocked=true')} className='text-sm font-medium text-primary'>돌아가기</button>
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
          <button onClick={() => router.replace('/?unlocked=true')} className='text-sm font-medium text-primary'>돌아가기</button>
        </div>
      </main>
    );
  }

  const passed = header.nativeScore >= 70;
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
            passed={passed}
            highlightMessage={header.highlightMessage}
            totalTurns={turnFeedbacks.length}
            goodTurns={goodTurns}
            scenarioTitle={scenario?.scenarioTitle ?? null}
            onNext={() => setPage(1)}
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
// 상단 게이지가 페이지 넘길수록 채워지고, 좌우 스와이프로 넘길 수 있음
function TurnDetailView({
  turns, sessionId, onBack,
}: {
  turns: ApiTurnFeedback[]; sessionId: number; onBack: () => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const isLast = index === turns.length - 1;
  const progress = (index + 1) / turns.length;

  function goNext() {
    if (!isLast) setIndex((i) => i + 1);
    else router.replace('/?unlocked=true');
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x < -60 || info.velocity.x < -300) goNext();
    else if (info.offset.x > 60 || info.velocity.x > 300) goPrev();
  }

  return (
    <div className='flex h-full flex-col bg-background' style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
      {/* 헤더 */}
      <div className='flex items-center px-4 pt-4 pb-2 shrink-0'>
        <button
          onClick={onBack}
          className='flex items-center justify-center w-8 h-8 -ml-1 rounded-full text-zinc-400 active:bg-zinc-100'
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <p className='flex-1 text-center text-lg font-bold text-zinc-800 pr-7'>상세 분석</p>
      </div>

      {/* 진행 게이지 */}
      <div className='px-4 pb-3 shrink-0'>
        <div className='relative h-1.5 rounded-full bg-zinc-200 overflow-hidden'>
          <motion.div
            className='absolute left-0 top-0 h-full rounded-full bg-[#E07A3A]'
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <p className='text-xs text-zinc-400 mt-1 text-right'>{index + 1} / {turns.length}</p>
      </div>

      {/* 카드 콘텐츠 */}
      <div className='relative flex-1 overflow-hidden'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={index}
            className='h-full'
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag='x'
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
          >
            <TurnCard turn={turns[index]} />
          </motion.div>
        </AnimatePresence>

      </div>

      {/* 마지막 페이지 CTA */}
      <AnimatePresence>
        {isLast && (
          <motion.div
            className='px-5 pt-3 shrink-0 border-t border-zinc-100'
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button onClick={goNext}>다음 대화 하러 갈게요</Button>
          </motion.div>
        )}
      </AnimatePresence>
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
  const router = useRouter();
  const interpretation = getScoreInterpretation(score);
  const displayScore = useCountUp(score, TRACK_DELAY, TRACK_DURATION);
  const trackEndSec = (TRACK_DELAY + TRACK_DURATION) / 1000;
  const [showExitModal, setShowExitModal] = useState(false);

  const turnStat = goodTurns > 0
    ? `${totalTurns}번 대화 중 ${goodTurns}번 잘 통했어요`
    : `${totalTurns}번 모두 끝까지 도전했어요`;

  return (
    <div className='flex h-full flex-col bg-background' style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
      {/* 네비게이션 헤더 */}
      <div className='flex items-center px-4 pt-4 pb-3 border-b border-zinc-200'>
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
                  onClick={() => router.replace('/?unlocked=true')}
                  className='w-full py-3 text-sm font-semibold text-zinc-400'
                >
                  그냥 나갈게요
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className='no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pt-2'>
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

// "원문 → 개선표현... 이유" 형태의 feedbackDetail을 파싱
function parseFeedbackDetail(detail: string): { before: string; after: string; reason: string } | null {
  const arrowIdx = detail.indexOf('→');
  const ellipsisIdx = detail.indexOf('...');
  if (arrowIdx === -1 || ellipsisIdx === -1 || ellipsisIdx < arrowIdx) return null;
  return {
    before: detail.slice(0, arrowIdx).trim(),
    after: detail.slice(arrowIdx + 1, ellipsisIdx).trim(),
    reason: detail.slice(ellipsisIdx + 3).trim(),
  };
}

function TurnCard({ turn }: { turn: ApiTurnFeedback }) {
  const isGood = turn.feedbackType === 'GOOD';
  const parsed = turn.feedbackDetail ? parseFeedbackDetail(turn.feedbackDetail) : null;

  return (
    <div className='no-scrollbar h-full overflow-y-auto overscroll-y-contain px-4 pt-2 pb-8 space-y-5'>

      {/* 채팅 UI */}
      <FadeIn delay={0}>
        <div>
          <p className='text-xs font-semibold text-zinc-500 mb-1.5 px-1'>질문</p>
          <AiBubble text={turn.originalQuestion} translatedText={turn.translatedQuestion} />
        </div>
      </FadeIn>
      <FadeIn delay={0.1}>
        <div>
          <p className='text-xs font-semibold text-zinc-500 mb-1.5 px-1 text-right'>내 답변</p>
          <UserBubble text={turn.userUtterance} />
        </div>
      </FadeIn>

      {/* 구분선 + 타입 제목 */}
      <div className='border-t border-zinc-100 mx-1 pt-3'>
        <FadeIn delay={0.2}>
          <p className='text-2xl font-black leading-tight text-zinc-800'>
            <span className='tossface'>{isGood ? '🙌' : '💪'}</span>{' '}
            {isGood ? '잘 통했어요' : '한 단계 더 업그레이드해봐요'}
          </p>
        </FadeIn>
      </div>

      {isGood ? (
        <>
          {turn.koreanAnalogy && (
            <FadeIn delay={0.18}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>한국어로 치면</p>
                <p className='text-base text-zinc-600 leading-relaxed px-1 pt-1'>{turn.koreanAnalogy}</p>
              </div>
            </FadeIn>
          )}

          {turn.feedbackDetail && (
            <FadeIn delay={0.3}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>잘한 이유</p>
                <p className='text-base text-zinc-700 leading-relaxed bg-zinc-50 rounded-2xl px-4 py-4'>{turn.feedbackDetail}</p>
              </div>
            </FadeIn>
          )}

          {turn.benchmarkMessage && (
            <FadeIn delay={0.42}>
              <div className='rounded-2xl bg-[#FFF4EC] border border-[#F0D9C8] px-4 py-4 space-y-1.5'>
                <p className='text-sm font-bold text-[#E07A3A]'>알고 있었나요?</p>
                <p className='text-base font-semibold text-zinc-800 leading-relaxed'>{turn.benchmarkMessage}</p>
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
                <p className='text-base text-zinc-600 leading-relaxed px-1 pt-1'>{turn.koreanAnalogy}</p>
              </div>
            </FadeIn>
          )}

          {parsed ? (
            <FadeIn delay={0.3}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>이렇게 하면 더 통해요</p>
                <div className='rounded-2xl border border-zinc-200 px-4 py-4 space-y-3'>
                  {/* 내 표현 → 더 나은 표현 한 줄 */}
                  <div className='flex items-center gap-2 flex-wrap'>
                    <p className='text-base font-semibold text-zinc-600 line-through decoration-zinc-600'>{parsed.before}</p>
                    <span className='text-zinc-300 font-bold'>→</span>
                    <p className='text-base font-bold text-zinc-800'>{parsed.after}</p>
                  </div>
                  {/* 이유 */}
                  {parsed.reason && (
                    <p className='text-sm text-zinc-500 leading-relaxed border-t border-zinc-200 pt-3'>{parsed.reason}</p>
                  )}
                </div>
              </div>
            </FadeIn>
          ) : turn.feedbackDetail ? (
            <FadeIn delay={0.3}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>이렇게 하면 더 통해요</p>
                <p className='text-base text-zinc-700 leading-relaxed bg-zinc-50 rounded-2xl px-4 py-4'>{turn.feedbackDetail}</p>
              </div>
            </FadeIn>
          ) : null}

          {turn.positiveFeedback && (
            <FadeIn delay={0.42}>
              <div className='space-y-2'>
                <p className='text-sm font-bold text-zinc-800'>잘한 점</p>
                <p className='text-base text-zinc-600 leading-relaxed px-1 pt-1'>{turn.positiveFeedback}</p>
              </div>
            </FadeIn>
          )}
        </>
      )}

      {/* 스와이프 힌트 */}
      <FadeIn delay={0.6}>
        <div className='relative h-14 overflow-visible'>
          <motion.span
            className='tossface text-2xl absolute top-1/2 -translate-y-1/2'
            style={{ right: -4 }}
            animate={{ x: [0, -140, -140], opacity: [1, 1, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut', times: [0, 0.7, 1] }}
          >
            👆
          </motion.span>
        </div>
      </FadeIn>
    </div>
  );
}
