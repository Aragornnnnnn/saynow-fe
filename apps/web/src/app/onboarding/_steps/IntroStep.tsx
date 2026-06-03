// 온보딩 1단계 — 서비스 소개 및 채팅 프리뷰
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { CHAT_PREVIEW_MESSAGES } from '../_types';

export function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col pt-7">
        <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
          내 영어,
          <br />
          외국인에게 통할까요?
        </h1>

        <div className="flex flex-1 items-center">
          <ChatPreview />
        </div>
      </div>

      <Button onClick={onNext}>계속하기</Button>
    </>
  );
}

function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = CHAT_PREVIEW_MESSAGES.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), i * 1000 + 300)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[330px] flex-col gap-3">
      <AnimatePresence>
        {CHAT_PREVIEW_MESSAGES.slice(0, visibleCount).map((message) => {
          const isUser = message.role === 'user';
          return (
            <motion.div
              key={message.text}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={`max-w-[78%] rounded-[22px] px-4 py-3 text-[15px] font-semibold leading-snug ${
                  isUser
                    ? 'rounded-br-md bg-primary text-white'
                    : 'rounded-bl-md text-[var(--onboarding-fg)]'
                }`}
                style={isUser ? undefined : { backgroundColor: 'var(--onboarding-panel)' }}
              >
                {message.text}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
