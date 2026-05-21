// 피드백 페이지 — 대화 결과 이해도 및 발화별 말풍선 피드백
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ApiTurnFeedback } from '@/lib/api';
import { useFeedbackQuery } from '@/queries/feedback';
import { triggerHaptic } from '@/bridge/commands';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { useTts } from '@/hooks/useTts';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const feedbackQuery = useFeedbackQuery(Number(id));
  const feedback = feedbackQuery.data;
  const error = feedbackQuery.error;

  if (feedbackQuery.isPending) {
    return (
      <main className='flex h-full flex-col bg-background'>
        <div className='no-scrollbar flex-1 overflow-y-auto'>
          {/* 헤더 스켈레톤 */}
          <div className='px-5 pt-12 pb-6 flex flex-col items-center gap-3'>
            <div className='h-12 w-12 rounded-full bg-card skeleton' />
            <div className='h-6 w-24 rounded-lg bg-card skeleton' />
            <div className='h-10 w-20 rounded-lg bg-card skeleton' />
            <div className='flex gap-0.5'>
              {[0,1,2].map(i => <div key={i} className='h-5 w-5 rounded-full bg-card skeleton' />)}
            </div>
            <div className='h-4 w-64 rounded bg-card skeleton' />
            <div className='h-4 w-48 rounded bg-card skeleton' />
          </div>
          {/* 카드 스켈레톤 */}
          <div className='px-4 pb-6 space-y-6'>
            {[0,1,2].map(i => (
              <div key={i} className='rounded-2xl bg-card p-4 space-y-3'>
                <div className='h-4 w-3/4 rounded bg-muted skeleton' />
                <div className='h-4 w-1/2 rounded bg-muted skeleton' />
                <div className='h-16 w-full rounded-xl bg-muted skeleton' />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !feedback) {
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

  return (
    <main className='flex h-full flex-col bg-background'>
      <div className='no-scrollbar flex-1 overflow-y-auto overscroll-y-contain'>
        <ResultHeader
          cleared={feedback.cleared}
          score={feedback.comprehensionScore}
          remainingHearts={feedback.remainingHearts}
          summary={feedback.feedbackSummary}
        />
        <div className='px-4 pb-6 space-y-6'>
          <TurnList turns={feedback.turnFeedbacks} />
        </div>
      </div>

      <div className='px-4 pb-3 pt-3 border-t border-border'>
        <button
          onClick={() => router.replace('/')}
          className='w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity'
        >
          홈으로 가기
        </button>
      </div>
    </main>
  );
}

// ─── ResultHeader ─────────────────────────────────────────────────────────────

interface ResultHeaderProps {
  cleared: boolean;
  score: number;
  remainingHearts: number;
  summary?: string;
}

function ResultHeader({ cleared, score, remainingHearts, summary }: ResultHeaderProps) {
  const [displayScore, setDisplayScore] = useState(0);

  // 입장 시 컨페티 + 카운트업
  useEffect(() => {
    if (cleared) {
      triggerHaptic('heavy');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.4 },
        colors: ['#E07A3A', '#FFF4ED', '#f59e0b', '#ffffff', '#fbbf24'],
      });
    }

    // 카운트업: 700ms 동안 0 → score
    const duration = 700;
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      // easeOut 커브
      setDisplayScore(Math.round(score * (1 - Math.pow(1 - progress, 3))));
      if (frame >= totalFrames) {
        setDisplayScore(score);
        clearInterval(timer);
      }
    }, 1000 / frameRate);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className='px-5 pt-12 pb-6 text-center'
    >
      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 260, damping: 16 }}
        className='mb-1 text-5xl'
      >
        {cleared ? '🎉' : '😅'}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className='text-xl font-bold text-foreground'
      >
        {cleared ? '클리어!' : '아쉬워요'}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        <p className='mt-2 text-sm text-muted-foreground'>
          총 이해도{' '}
          <span className={`text-3xl font-bold tabular-nums ${cleared ? 'text-green-600' : comprehensionStyle(score)}`}>
            {displayScore}%
          </span>
        </p>
        <div className='mt-2 flex justify-center gap-0.5'>
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: i < remainingHearts ? 1 : 0.2 }}
              transition={{ delay: 0.45 + i * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
              className='text-base'
            >
              ❤️
            </motion.span>
          ))}
        </div>
        {summary && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.35 }}
            className='mt-3 text-sm text-muted-foreground leading-relaxed'
          >
            {summary}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── TurnList ─────────────────────────────────────────────────────────────────

function TurnList({ turns }: { turns: ApiTurnFeedback[] }) {
  return (
    <>
      {turns.map((turn, index) => (
        <TurnBubblePair key={turn.turnId} turn={turn} index={index} />
      ))}
    </>
  );
}

// ─── TurnBubblePair ───────────────────────────────────────────────────────────

function TurnBubblePair({ turn, index }: { turn: ApiTurnFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const isGood = !turn.feedbackRequired;
  const { speak } = useTts();
  const feedbackRef = useRef<HTMLDivElement>(null);

  function handleUserBubblePress() {
    if (isGood) return;
    const opening = !expanded;
    setExpanded(opening);
    setHintDismissed(true);
    if (opening) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  function handleSpeak() {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }
    speak(turn.originalQuestion, null, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.12, duration: 0.35, ease: 'easeOut' }}
      className='space-y-2'
    >
      <AiBubble
        text={turn.originalQuestion}
        translatedText={turn.translatedQuestion}
        showTranslation={showTranslation}
        isSpeaking={isSpeaking}
        onSpeak={handleSpeak}
        onToggleTranslation={() => setShowTranslation((v) => !v)}
      />

      <UserBubble text={turn.userUtterance} onPress={isGood ? undefined : handleUserBubblePress}>
        {isGood && <p className='text-xs font-semibold text-green-600'>✓ 잘했어요</p>}
        {!isGood && !hintDismissed && (
          <p className='text-xs text-muted-foreground'>탭해서 피드백 보기</p>
        )}
      </UserBubble>

      <AnimatePresence initial={false}>
        {!isGood && expanded && (
          <motion.div
            ref={feedbackRef}
            key='feedback'
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className='flex flex-col items-end gap-2'
          >
            {(turn.nativeLanguageInterpretation || turn.nativeUnderstanding) && (
              <div className='rounded-2xl rounded-tr-none bg-zinc-100 px-4 py-3 max-w-[85%] space-y-1'>
                <p className='text-[11px] font-semibold text-muted-foreground tracking-wide'>🎧 외국인 귀에는</p>
                {turn.nativeLanguageInterpretation && (
                  <p className='text-sm font-semibold text-foreground leading-snug'>&ldquo;{turn.nativeLanguageInterpretation}&rdquo;</p>
                )}
                {turn.nativeUnderstanding && (
                  <p className='text-xs text-muted-foreground leading-relaxed'>{turn.nativeUnderstanding}</p>
                )}
              </div>
            )}
            {turn.betterExpression && (
              <div className='rounded-2xl rounded-tr-none bg-green-50 border border-green-200 px-4 py-3 max-w-[85%] space-y-1'>
                <p className='text-[11px] font-semibold text-green-600 tracking-wide'>✨ 이렇게 말하면 더 자연스러워요</p>
                <p className='text-sm font-bold text-green-700 leading-snug'>{turn.betterExpression}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function comprehensionStyle(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}
