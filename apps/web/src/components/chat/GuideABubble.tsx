// 가이드 답변 말풍선 — AI의 영어 학습 설명 (말풍선 내부 상단에 GUIDE 레이블)
'use client';

import { motion } from 'framer-motion';

interface GuideABubbleProps {
  text: string;
}

export function GuideABubble({ text }: GuideABubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-start gap-1"
    >
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md bg-blue-50 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-bold tracking-widest text-blue-400">GUIDE</p>
          <p className="text-sm text-blue-900 leading-relaxed">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
