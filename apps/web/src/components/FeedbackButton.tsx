// 헤더에서 여는 의견 보내기 버튼 + 바텀시트 — 만족도 + 자유 의견
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { triggerHaptic } from '@/bridge/commands';
import { webBridge } from '@/bridge/webBridge';
import { submitNps } from '@/lib/api/feedback';
import { track, EVENTS } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';

const EMOJIS = ['😩', '😟', '😶', '😄', '🤩'] as const;
type EmojiScore = 1 | 2 | 3 | 4 | 5;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          track(EVENTS.OPINION_SHEET_OPENED);
          setOpen(true);
        }}
        className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-all active:scale-90 active:bg-zinc-100"
        aria-label="의견 보내기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a8.38 8.38 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
        <span className="whitespace-nowrap text-[10px] font-medium" style={{ color: '#888' }}>의견 보내기</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <FeedbackSheetContent onDone={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}

function FeedbackSheetContent({ onDone }: { onDone: () => void }) {
  const [score, setScore] = useState<EmojiScore | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSelect(s: EmojiScore) {
    if (webBridge.isAvailable()) triggerHaptic('light');
    setScore(s);
  }

  async function handleSubmit() {
    if (score !== null) {
      track(EVENTS.OPINION_SUBMITTED, { score, has_comment: comment.trim().length > 0 });
      try {
        await submitNps(0, score, comment || undefined);
      } catch {
        // 제출 실패해도 UX 차단 안 함
      }
    }
    setSubmitted(true);
    setTimeout(onDone, 1200);
  }

  if (submitted) {
    return (
      <div className="py-6 flex flex-col items-center gap-2">
        <span className="tossface text-4xl">🙏</span>
        <p className="text-base font-bold text-zinc-800">소중한 의견 고마워요!</p>
        <p className="text-sm text-zinc-500">한 글자도 빼놓지 않고 읽어볼게요</p>
      </div>
    );
  }

  return (
    <>
      {/* 제목(질문) + 닫기 */}
      <div className="relative mb-6">
        <button onClick={onDone} className="absolute -top-1 right-0 text-xl leading-none text-muted-foreground">
          ✕
        </button>
        <p className="pr-8 text-xl font-bold leading-snug text-foreground">Landit을 쓰면서 얼마나 만족하시나요?</p>
      </div>

      {/* 만족도 */}
      <div className="mb-7 flex justify-between">
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
              className="relative flex flex-col items-center pb-3"
            >
              <span className="tossface text-4xl">{emoji}</span>
              <AnimatePresence>
                {selected && (
                  <motion.div
                    key="dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* 의견 — 항상 노출 */}
      <p className="mb-2 text-sm font-medium text-foreground">전하고 싶은 의견이 있다면?</p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder="대화 흐름, 발음, AI 피드백 등 자유롭게 적어주세요"
        className="w-full resize-none rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />
      <p className="mt-1.5 mb-5 text-xs text-muted-foreground">주신 의견은 한 글자도 빼놓지 않고 꼼꼼히 읽어볼게요.</p>

      <Button size="md" onClick={handleSubmit} disabled={score === null}>
        {score === null ? '얼마나 만족하는지 알려줘요' : '제출할게요'}
      </Button>
    </>
  );
}
