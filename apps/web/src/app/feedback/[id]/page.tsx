// 피드백 페이지 — 대화 결과 이해도 및 발화별 말풍선 피드백
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ApiTurnFeedback } from '@/lib/api';
import { useFeedbackQuery } from '@/queries/feedback';
import { triggerHaptic } from '@/bridge/commands';
import { getScenarioImage } from '@/lib/scenarioImages';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { useTts } from '@/hooks/useTts';
import { Button } from '@/components/ui/Button';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = Number(searchParams.get('scenarioId') ?? 1);
  const feedbackQuery = useFeedbackQuery(Number(id));
  const feedback = feedbackQuery.data;
  const error = feedbackQuery.error;

  const [loadingDone, setLoadingDone] = useState(!feedbackQuery.isPending);

  if (!loadingDone) {
    return (
      <FeedbackLoadingScreen
        dataReady={!feedbackQuery.isPending}
        onDone={() => setLoadingDone(true)}
      />
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
    <IntroCardLayout
      cleared={feedback.cleared}
      score={feedback.comprehensionScore}
      scenarioId={scenarioId}
    >
      <main className='flex h-full flex-col bg-background'>
        <div className='no-scrollbar flex-1 overflow-y-auto overscroll-y-contain'>
          <ResultHeader
            cleared={feedback.cleared}
            score={feedback.comprehensionScore}
            remainingHearts={feedback.remainingHearts}
            summary={feedback.feedbackSummary}
          />
          <div className='px-4 pb-6 space-y-6'>
            {feedback.turnFeedbacks.map((turn, index) => (
              <TurnBubblePair key={turn.turnId} turn={turn} index={index} />
            ))}
          </div>
        </div>

        <HomeButton onNavigate={() => router.replace('/?survey=true')} />
      </main>
    </IntroCardLayout>
  );
}

// ─── FeedbackLoadingScreen ────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  '대화 내용 분석 중...',
  '외국인 관점 파악 중...',
  '이해도 계산 중...',
  '피드백 정리 중...',
];

function FeedbackLoadingScreen({ dataReady, onDone }: { dataReady: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const dataReadyRef = useRef(dataReady);
  dataReadyRef.current = dataReady;
  const doneCalledRef = useRef(false);

  function callDone() {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    setTimeout(onDone, 300);
  }

  useEffect(() => {
    const start = Date.now();
    const duration = 2800;
    let raf: number;
    function tick() {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const natural = t * t * (3 - 2 * t) * 92;
      if (dataReadyRef.current) {
        setProgress(100);
        callDone();
        return;
      }
      setProgress(natural);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 루프 종료 후 데이터 도착 감지
  useEffect(() => {
    if (dataReady) {
      setProgress(100);
      callDone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  // 1.2초마다 메시지 순환 (데이터 도착 전까지)
  useEffect(() => {
    if (dataReady) return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1200);
    return () => clearInterval(id);
  }, [dataReady]);

  return (
    <main className='flex h-full flex-col items-center justify-center bg-background px-8 gap-5'>
      <AnimatePresence mode='wait'>
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className='text-sm font-medium text-muted-foreground'
        >
          {LOADING_MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>
      <div className='w-full max-w-xs h-1.5 rounded-full bg-muted overflow-hidden'>
        <motion.div
          className='h-full rounded-full bg-primary'
          style={{ width: `${progress}%` }}
          transition={{ ease: 'linear' }}
        />
      </div>
    </main>
  );
}

// ─── IntroCardLayout ──────────────────────────────────────────────────────────

interface IntroCardLayoutProps {
  cleared: boolean;
  score: number;
  scenarioId: number;
  children: React.ReactNode;
}

function IntroCardLayout({ cleared, score, scenarioId, children }: IntroCardLayoutProps) {
  const [slidUp, setSlidUp] = useState(false);
  const [dragY, setDragY] = useState(0);
  const imageUrl = getScenarioImage(scenarioId, cleared ? 'success' : 'fail');

  useEffect(() => {
    if (cleared) {
      triggerHaptic('heavy');
      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.4 },
        colors: ['#E07A3A', '#FFF4ED', '#f59e0b', '#ffffff', '#fbbf24'],
      });
    }
  }, [cleared]);

  return (
    <div className='relative h-full overflow-hidden'>
      {/* 피드백 콘텐츠 — 뒤에 깔림 */}
      <div className='absolute inset-0'>{children}</div>

      {/* 인트로 카드 — 위로 슬라이드 아웃 */}
      <motion.div
        className='absolute inset-0 flex flex-col cursor-pointer'
        drag={slidUp ? false : 'y'}
        dragConstraints={{ top: -window.innerHeight, bottom: 0 }}
        dragElastic={{ top: 0.3, bottom: 0 }}
        onDrag={(_, info) => setDragY(info.offset.y)}
        onDragEnd={(_, info) => {
          if (info.offset.y < -60 || info.velocity.y < -300) {
            setSlidUp(true);
          }
          setDragY(0);
        }}
        onClick={() => { if (Math.abs(dragY) < 5) setSlidUp(true); }}
        animate={{ y: slidUp ? '-100%' : 0 }}
        transition={slidUp ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] } : { type: 'spring', stiffness: 400, damping: 40 }}
      >
        {/* 배경 이미지 */}
        <div
          className='absolute inset-0 bg-cover bg-center'
          style={{ backgroundImage: `url(${imageUrl})`, backgroundColor: cleared ? '#5a9e6f' : '#9e5a5a' }}
        />
        <div
          className='absolute inset-0'
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.78) 100%)' }}
        />

        {/* 콘텐츠 */}
        <motion.div
          className='relative z-10 mt-auto flex flex-col items-center gap-2 pb-16 px-7'
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <span className='text-5xl leading-none'>{cleared ? '🎉' : '😅'}</span>
          <p className='mt-2 text-4xl font-extrabold tracking-tight text-white'>
            {cleared ? '클리어!' : '아쉬워요'}
          </p>
          <p className='text-lg font-semibold text-white/75'>이해도 {score}%</p>

          {/* 깜빡이는 화살표 힌트 */}
          <div className='mt-6 flex flex-col items-center gap-1 pointer-events-none'>
            <motion.span
              className='text-2xl text-white/50'
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              ↓
            </motion.span>
            <span className='text-xs text-white/45'>탭하거나 위로 스와이프</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
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

  // 카운트업: 700ms 동안 0 → score (confetti/haptic은 IntroCardLayout에서 처리)
  useEffect(() => {
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


// ─── TurnBubblePair ───────────────────────────────────────────────────────────

function TurnBubblePair({ turn, index }: { turn: ApiTurnFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const isGood = !turn.feedbackRequired;
  const { speak, stop } = useTts();
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
      stop();
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

// ─── HomeButton ───────────────────────────────────────────────────────────────

function HomeButton({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className='px-4 pb-3 pt-3 border-t border-border'>
      <Button onClick={onNavigate}>홈으로 가기</Button>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function comprehensionStyle(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}
