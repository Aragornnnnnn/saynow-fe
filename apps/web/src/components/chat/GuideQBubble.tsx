// 가이드 질문 말풍선 — 사용자가 대화 중 입력한 한국어 질문
'use client';

import { motion } from 'framer-motion';

interface GuideQBubbleProps {
  text: string;
}

export function GuideQBubble({ text }: GuideQBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-end gap-1 self-end"
    >
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-br-md bg-blue-100 px-4 py-3">
          <p className="text-sm text-blue-900 leading-relaxed">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
