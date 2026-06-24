// 대화 중 마스코트 Sona가 상대의 속마음을 화면 위로 잠깐 전해주는 플로팅 반응 오버레이
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { InnerThoughtType } from '@/lib/api';

export interface FloatingThought {
  text: string;
  type: InnerThoughtType;
}

// 타입별 톤 후광 색 — Sona 표정과 함께 톤(GOOD/NORMAL/BAD)을 은은하게 전달
const TYPE_HALO: Record<InnerThoughtType, string> = {
  GOOD: '#E1F5EE',
  NORMAL: '#F1EFE8',
  BAD: '#FAEEDA',
};

// 속마음 노출 시간(ms) — 글자 수에 비례. 짧으면 산뜻, 길면 충분히 읽히게.
export function thoughtReadMs(text: string): number {
  return Math.min(5000, Math.max(2600, 1600 + text.length * 60));
}

export function ThoughtCard({ thought }: { thought: FloatingThought }) {
  const halo = TYPE_HALO[thought.type];
  return (
    <div className='flex w-full max-w-[300px] flex-col items-center rounded-[28px] bg-white px-6 pt-7 pb-6 shadow-xl'>
      {/* 캐릭터 + 톤 후광 — 표정과 후광색으로 톤 전달 */}
      <div
        className='flex items-center justify-center rounded-full'
        style={{ width: 120, height: 120, backgroundColor: halo }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/character/sona-${thought.type.toLowerCase()}.webp`}
          alt='Sona'
          className='object-contain'
          style={{ width: 104, height: 104 }}
        />
      </div>
      <p className='mt-5 text-center text-base italic leading-relaxed text-zinc-800'>{thought.text}</p>
    </div>
  );
}

export function ThoughtOverlay({ thought }: { thought: FloatingThought | null }) {
  return (
    <div className='pointer-events-none absolute inset-0 z-30'>
      <AnimatePresence>
        {thought && (
          <motion.div
            key='thought'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='absolute inset-0'
          >
            <div className='absolute inset-0' style={{ backgroundColor: 'rgba(16,10,6,0.5)' }} />
            <motion.div
              className='absolute inset-0 flex items-center justify-center px-6'
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ThoughtCard thought={thought} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
