// 온보딩 1단계 — 인사 + 서비스 핵심 가치 전달
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function IntroStep({ nickname, onNext }: { nickname: string; onNext: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col pt-7 space-y-5">
        <h1 className="text-[30px] font-black leading-[1.3] tracking-normal">
          안녕하세요, {nickname}님{' '}
          <motion.span
            className="tossface inline-block"
            animate={{ rotate: [0, 20, -10, 20, -5, 0] }}
            transition={{ delay: 0.5, duration: 1, ease: 'easeInOut' }}
          >
            👋
          </motion.span>
          <br />
          같이 편하게 이야기해봐요
        </h1>

        <p className="text-[20px] font-bold leading-snug">
          대화가 끝나면 외국인 귀에
          <br />
          어떻게 들렸는지 알려드릴게요
        </p>
      </div>

      <Button onClick={onNext}>좋아요!</Button>
    </>
  );
}
