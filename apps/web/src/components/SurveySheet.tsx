// 연습 종료 후 만족도 서베이 — 바텀시트/센터 팝업 두 버전
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { triggerHaptic } from '@/bridge/commands';
import { Button } from '@/components/ui/Button';
import { submitNps } from '@/lib/api';

const EMOJIS = ['😩', '😟', '😶', '😄', '🤩'] as const;
type EmojiScore = 1 | 2 | 3 | 4 | 5;

interface SurveySheetProps {
  sessionId: number | null;
  onDone: () => void;
}

export function SurveySheet({ sessionId, onDone }: SurveySheetProps) {
  const [score, setScore] = useState<EmojiScore | null>(null);
  const [comment, setComment] = useState('');
  const needsComment = score !== null && score <= 2;

  function handleSelect(s: EmojiScore) {
    triggerHaptic('light');
    setScore(s);
    if (s > 2) setComment('');
  }

  async function handleDone() {
    if (score !== null && sessionId !== null) {
      try {
        await submitNps(sessionId, score, comment || undefined);
      } catch {
        // 제출 실패해도 UX 차단 안 함
      }
    }
    onDone();
  }

  const content = (
    <>
      {/* 헤더 */}
      <div className='mb-5 flex items-start justify-between'>
        <div>
          <p className='text-base font-bold text-foreground'>방금 연습 어떠셨어요?</p>
          <p className='mt-0.5 text-xs text-muted-foreground'>솔직하게 말해줘요, 다 듣고 반영할게요</p>
        </div>
        <button onClick={handleDone} className='text-xl leading-none text-muted-foreground'>
          ✕
        </button>
      </div>

      {/* 이모티콘 */}
      <div className='mb-7 flex justify-between'>
        {EMOJIS.map((emoji, i) => {
          const s = (i + 1) as EmojiScore;
          const selected = score === s;
          const dimmed = score !== null && !selected;
          return (
            <motion.button
              key={emoji}
              onClick={() => handleSelect(s)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: selected ? 1.25 : 1,
                opacity: dimmed ? 0.3 : 1,
                y: selected ? -6 : 0,
              }}
              transition={{
                scale: { type: 'spring', stiffness: 420, damping: 18, delay: score === null ? 0.05 + i * 0.07 : 0 },
                opacity: { duration: 0.15 },
                y: { type: 'spring', stiffness: 420, damping: 18 },
              }}
              whileTap={{ scale: 0.8 }}
              className='relative flex flex-col items-center pb-3'
            >
              <span className='tossface text-4xl'>{emoji}</span>
              <AnimatePresence>
                {selected && (
                  <motion.div
                    key='dot'
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className='absolute bottom-0 h-1.5 w-1.5 rounded-full bg-primary'
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* 아쉬운 점 입력 */}
      <AnimatePresence>
        {needsComment && (
          <motion.div
            key='comment'
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className='overflow-hidden'
          >
            <div className='mb-5'>
              <p className='mb-2 text-sm font-medium text-foreground'>어떤 점이 아쉬우셨나요?</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder='대화 흐름, 발음, AI 피드백 등 자유롭게 적어주세요'
                className='w-full resize-none rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary'
                autoFocus
              />
              <p className='mt-1 text-right text-xs text-muted-foreground'>{comment.length} / 300</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 완료 버튼 */}
      <Button size="md" onClick={handleDone}>완료</Button>
    </>
  );

  return (
    <motion.div
      className='fixed inset-0 z-50 flex items-center justify-center px-6'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className='absolute inset-0 bg-black/40' onClick={handleDone} />
      <motion.div
        className='relative w-full max-w-sm rounded-3xl bg-background px-6 py-6 shadow-xl'
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.85 }}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
