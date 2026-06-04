// 온보딩 2단계 — TTS 소리 확인 (진행 바 + 말풍선)
'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function SoundStep({
  question,
  isSpeaking,
  bubbleVisible,
  resetKey,
  onReplay,
  onNext,
}: {
  question: string;
  isSpeaking: boolean;
  bubbleVisible: boolean;
  resetKey: number;
  onReplay: () => void;
  onNext: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const duration = Math.max(3000, question.length * 80);

  useEffect(() => {
    if (resetKey === 0) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(0);
  }, [resetKey]);

  useEffect(() => {
    if (isSpeaking) {
      setHasPlayed(true);
      startTimeRef.current = Date.now();
      const tick = () => {
        const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
        const p = Math.min((elapsed / duration) * 100, 98);
        setProgress(p);
        if (p < 98) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hasPlayed) setProgress(100);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  return (
    <>
      <div className="flex flex-1 flex-col pt-7">
        <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
          제가 이렇게 말을 걸게요
        </h1>

        <div className="flex flex-1 flex-col justify-center gap-8">
          <div className="min-h-14 flex flex-col justify-end">
            <AnimatePresence>
              {bubbleVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="self-start max-w-[85%] rounded-[20px] rounded-tl-md px-4 py-3"
                  style={{ backgroundColor: 'var(--onboarding-panel)' }}
                >
                  <p className="text-[17px] font-semibold leading-snug">{question}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--onboarding-line)' }}>
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear', duration: 0.1 }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="h-5 text-sm font-medium text-[var(--onboarding-muted)]">
                {isSpeaking ? '재생 중' : ''}
              </p>
              {hasPlayed && (
                <button
                  type="button"
                  onClick={onReplay}
                  disabled={isSpeaking}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[var(--onboarding-muted)] disabled:opacity-0 transition-opacity active:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                  </svg>
                  다시 듣기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={onNext} disabled={!hasPlayed}>
        잘 들려요!
      </Button>
    </>
  );
}
