// 온보딩 4단계 — 첫 시나리오 소개 및 대화 시작
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, LoaderCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { type ApiScenario } from '@/lib/api';
import { FALLBACK_TRANSLATED_QUESTION } from '../_types';

export function ScenarioStep({
  scenario,
  isPending,
  errorMessage,
  isUnlocked,
  onRetry,
  onStart,
}: {
  scenario: ApiScenario | null;
  isPending: boolean;
  errorMessage: string | null;
  isUnlocked: boolean;
  onRetry: () => void;
  onStart: () => void;
}) {
  const previewQuestion = scenario?.firstQuestionPreview?.translatedQuestion ?? FALLBACK_TRANSLATED_QUESTION;

  return (
    <>
      <div className="flex flex-1 flex-col gap-10 pt-7">
        <div className="space-y-4">
          <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
            준비됐어요,
            <br />
            바로 시작해봐요
          </h1>
        </div>

        {isPending ? (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--onboarding-muted)]">
            <LoaderCircle className="animate-spin" size={28} />
            <p className="text-sm font-semibold">시나리오를 불러오는 중이에요.</p>
          </div>
        ) : errorMessage ? (
          <div
            className="space-y-4 rounded-[24px] border p-5 text-center"
            style={{ backgroundColor: 'var(--onboarding-panel)', borderColor: 'var(--onboarding-line)' }}
          >
            <p className="text-sm font-semibold leading-relaxed text-[var(--onboarding-muted)]">{errorMessage}</p>
            <button type="button" onClick={onRetry} className="text-sm font-bold text-primary">
              다시 시도
            </button>
          </div>
        ) : scenario ? (
          <div className="space-y-5">
            <div
              className="overflow-hidden rounded-[28px] border p-5"
              style={{ backgroundColor: 'var(--onboarding-panel)', borderColor: 'var(--onboarding-line)' }}
            >
              <AnimatePresence mode="wait">
                {!isUnlocked ? (
                  <motion.div
                    key="locked"
                    className="flex items-center gap-4"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.24 }}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--onboarding-panel-soft)] text-[var(--onboarding-muted)]">
                      <Lock size={25} />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold leading-snug">{scenario.scenarioTitle}</p>
                      <p className="mt-1 text-sm font-medium text-[var(--onboarding-muted)]">잠금 해제 중</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="unlocked"
                    className="space-y-5"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="tossface flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-[34px]">
                        {scenario.scenarioEmoji ?? '🍕'}
                      </div>
                      <div>
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
                          <Check size={13} />
                          해금
                        </div>
                        <p className="text-lg font-extrabold leading-snug">{scenario.scenarioTitle}</p>
                      </div>
                    </div>
                    <p className="text-[15px] font-medium leading-relaxed text-[var(--onboarding-muted)]">
                      {scenario.briefing}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              className="rounded-[24px] border p-5"
              style={{ backgroundColor: 'var(--onboarding-panel-soft)', borderColor: 'var(--onboarding-line)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isUnlocked ? 1 : 0.35, y: isUnlocked ? 0 : 10 }}
              transition={{ duration: 0.3, delay: isUnlocked ? 0.08 : 0 }}
            >
              <p className="text-xs font-bold text-primary">첫 질문</p>
              <p className="mt-2 text-[18px] font-extrabold leading-snug">{previewQuestion}</p>
            </motion.div>
          </div>
        ) : (
          <div
            className="rounded-[24px] border p-5 text-center text-sm font-semibold text-[var(--onboarding-muted)]"
            style={{ backgroundColor: 'var(--onboarding-panel)', borderColor: 'var(--onboarding-line)' }}
          >
            시작할 시나리오를 찾지 못했어요.
          </div>
        )}
      </div>

      <Button onClick={onStart} disabled={!scenario || isPending || !!errorMessage || !isUnlocked}>
        대화 시작하기
      </Button>
    </>
  );
}
