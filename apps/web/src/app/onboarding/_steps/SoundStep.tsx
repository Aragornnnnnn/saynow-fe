// 온보딩 2단계 — TTS 소리 확인 (글자 순서대로 주황색 하이라이트)
'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function SoundStep({
  question,
  isSpeaking,
  bubbleVisible,
  onNext,
}: {
  question: string;
  isSpeaking: boolean;
  bubbleVisible: boolean;
  onNext: () => void;
}) {
  const [litIndex, setLitIndex] = useState(-1);
  const rafRef = useRef<number | null>(null);
  // 각 바의 랜덤값 고정 (리렌더링마다 달라지지 않도록)
  const barSeeds = useRef(Array.from({ length: 28 }, () => Math.random()));

  useEffect(() => {
    if (!isSpeaking) {
      setLitIndex(-1);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const chars = question.length;
    const duration = Math.max(2500, chars * 75);
    const start = Date.now();
    function tick() {
      const t = Math.min((Date.now() - start) / duration, 1);
      setLitIndex(Math.floor(t * chars));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  return (
    <>
      <div className="flex flex-1 flex-col pt-7">
        <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
          제가 이렇게 말을 걸게요
          <br />
          소리가 잘 들리나요?
        </h1>

        <div className="flex flex-1 flex-col justify-center gap-6">

          {/* 오디오 파형 비주얼라이저 */}
          <div className="flex items-center justify-center gap-0.75 h-16">
            {barSeeds.current.map((seed, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{ width: 3, backgroundColor: 'var(--primary)' }}
                animate={isSpeaking ? {
                  height: [4 + seed * 8, 14 + seed * 42, 4 + seed * 8],
                  opacity: [0.35, 1, 0.35],
                } : { height: 4, opacity: 0.2 }}
                transition={isSpeaking ? {
                  duration: 0.3 + seed * 0.35,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                  delay: i * 0.03,
                } : { duration: 0.3 }}
              />
            ))}
          </div>

          {/* 말풍선 — min-h로 사라질 때 레이아웃 유지 */}
          <div className="min-h-30 flex items-center w-full">
            <AnimatePresence>
              {bubbleVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full rounded-[28px] rounded-tl-md px-6 py-7"
                  style={{ backgroundColor: 'var(--onboarding-panel)' }}
                >
                  <p className="text-[22px] font-bold leading-snug">
                    {question.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        animate={{ color: i < litIndex ? '#E07A3A' : '#1a1a1a' }}
                        transition={{ duration: 0.08 }}
                        style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : undefined }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Button onClick={onNext}>
        잘 들려요!
      </Button>
    </>
  );
}
