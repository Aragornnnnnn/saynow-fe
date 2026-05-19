// AI 말풍선 — TTS 재생·번역 토글 포함, 대화/피드백 페이지 공용
'use client';

import { Volume2, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingDots } from './TypingDots';

interface AiBubbleProps {
  text: string;
  translatedText?: string;
  showTranslation?: boolean;
  isSpeaking?: boolean;
  onSpeak?: () => void;
  onToggleTranslation?: () => void;
}

export function AiBubble({
  text,
  translatedText,
  showTranslation,
  isSpeaking,
  onSpeak,
  onToggleTranslation,
}: AiBubbleProps) {
  const isDots = text === '...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-start gap-2"
    >
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-none bg-[#EBEBEB] px-4 py-3">
          {isDots ? (
            <TypingDots />
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">{text}</p>
              <AnimatePresence initial={false}>
                {showTranslation && translatedText && (
                  <motion.p
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="border-t border-black/5 pt-2 text-xs text-muted-foreground leading-relaxed overflow-hidden"
                  >
                    {translatedText}
                  </motion.p>
                )}
              </AnimatePresence>
              {(onSpeak || (onToggleTranslation && translatedText)) && (
                <div className="mt-2.5 flex gap-2">
                  {onSpeak && (
                    <button
                      onClick={onSpeak}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        isSpeaking ? 'bg-foreground text-white' : 'bg-black/8 text-foreground'
                      }`}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                  {onToggleTranslation && translatedText && (
                    <button
                      onClick={onToggleTranslation}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        showTranslation ? 'bg-foreground text-white' : 'bg-black/8 text-foreground'
                      }`}
                    >
                      <Languages size={14} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
