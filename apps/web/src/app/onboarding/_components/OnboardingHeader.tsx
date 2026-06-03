// 온보딩 상단 뒤로가기 버튼 + 스텝 인디케이터
'use client';

import { ChevronLeft } from 'lucide-react';
import { STEP_ORDER, type OnboardingStep } from '../_types';

export function OnboardingHeader({ step, onBack }: { step: OnboardingStep; onBack: () => void }) {
  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <header
      className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 18px)' }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="이전"
        disabled={stepIndex === 0}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--onboarding-fg)] transition-opacity active:bg-black/5 disabled:opacity-0"
      >
        <ChevronLeft size={28} strokeWidth={2.8} />
      </button>

      <div className="flex items-center gap-1.5">
        {STEP_ORDER.map((item, index) => (
          <span
            key={item}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: index === stepIndex ? 18 : 6,
              backgroundColor: index <= stepIndex ? 'var(--onboarding-fg)' : 'var(--onboarding-line)',
              opacity: index === stepIndex ? 0.95 : 0.6,
            }}
          />
        ))}
      </div>
    </header>
  );
}
