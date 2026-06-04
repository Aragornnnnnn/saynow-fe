// AI 말풍선 — 번역 기본 표시, 대화/피드백 페이지 공용
'use client';

import { motion } from 'framer-motion';
import { TypingDots } from './TypingDots';

interface AiBubbleProps {
  text: string;
  translatedText?: string;
}

export function AiBubble({ text, translatedText }: AiBubbleProps) {
  const isDots = text === '...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-start gap-2"
    >
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md bg-[#EBEBEB] px-4 py-3">
          {isDots ? (
            <TypingDots />
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">{text}</p>
              {translatedText && (
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {translatedText}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
