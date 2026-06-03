'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, LoaderCircle, Lock, Mic, Volume2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { openNativeSettings, startNativeStt, stopNativeStt } from '@/bridge/commands';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { webBridge } from '@/bridge/webBridge';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTts } from '@/hooks/useTts';
import { prefetchSession, type ApiScenario } from '@/lib/api';
import { getScenarioImage } from '@/lib/scenarioImages';
import { markOnboardingComplete } from '@/lib/onboarding';
import { useScenariosQuery } from '@/queries/scenarios';
import { useAuthStore } from '@/store/authStore';
import { useScenarioStore } from '@/store/scenarioStore';

type OnboardingStep = 'intro' | 'mic' | 'sound' | 'scenario';
type MicPermissionState = 'idle' | 'requesting' | 'denied';

const STEP_ORDER: OnboardingStep[] = ['intro', 'mic', 'sound', 'scenario'];
const FALLBACK_QUESTION = 'What is your favorite food?';
const FALLBACK_TRANSLATED_QUESTION = '가장 좋아하는 음식이 뭐예요?';
const CHAT_PREVIEW_MESSAGES = [
  { role: 'ai', text: 'What food do you like?' },
  { role: 'user', text: 'I like pizza.' },
  { role: 'ai', text: 'Nice. Why do you like it?' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const member = useAuthStore((s) => s.member);
  const setScenario = useScenarioStore((s) => s.setScenario);
  const { data, isPending, error, refetch } = useScenariosQuery(isReady);
  const { speak, stop } = useTts();

  const [step, setStep] = useState<OnboardingStep>('intro');
  const [micState, setMicState] = useState<MicPermissionState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [scenarioUnlocked, setScenarioUnlocked] = useState(false);
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micDeniedRef = useRef(false);

  const firstScenario = useMemo(() => {
    return data?.categories.flatMap((category) => category.scenarios).find((scenario) => !scenario.locked) ?? null;
  }, [data]);

  const previewQuestion = firstScenario?.firstQuestionPreview?.aiQuestion ?? FALLBACK_QUESTION;
  const previewTranslatedQuestion =
    firstScenario?.firstQuestionPreview?.translatedQuestion ?? FALLBACK_TRANSLATED_QUESTION;

  const goToStep = useCallback((nextStep: OnboardingStep) => {
    setStep(nextStep);
  }, []);

  const handleBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [step]);

  useBackButtonBridge(handleBack);

  useEffect(() => {
    return () => {
      if (micTimerRef.current) clearTimeout(micTimerRef.current);
      stop();
    };
  }, [stop]);

  useEffect(() => {
    if (step !== 'scenario') return;

    setScenarioUnlocked(false);
    const timer = setTimeout(() => setScenarioUnlocked(true), 650);
    return () => clearTimeout(timer);
  }, [step, firstScenario?.scenarioId]);

  const playQuestion = useCallback(() => {
    speak(previewQuestion, null, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, [previewQuestion, speak]);

  useEffect(() => {
    if (step !== 'sound') return;

    const timer = setTimeout(() => playQuestion(), 250);
    return () => {
      clearTimeout(timer);
      stop();
      setIsSpeaking(false);
    };
  }, [playQuestion, step, stop]);

  useBridgeEvent(
    'MIC_PERMISSION_DENIED',
    useCallback(() => {
      micDeniedRef.current = true;
      if (micTimerRef.current) clearTimeout(micTimerRef.current);
      setMicState('denied');
    }, []),
  );

  async function requestMicrophonePermission() {
    setMicState('requesting');
    micDeniedRef.current = false;

    if (webBridge.isAvailable()) {
      startNativeStt();
      micTimerRef.current = setTimeout(() => {
        stopNativeStt();
        if (!micDeniedRef.current) {
          setMicState('idle');
          goToStep('sound');
        }
      }, 700);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState('idle');
      goToStep('sound');
    } catch {
      setMicState('denied');
    }
  }

  function startConversation() {
    if (!member || !firstScenario) return;

    setScenario({
      scenarioId: firstScenario.scenarioId,
      scenarioTitle: firstScenario.scenarioTitle,
      briefing: firstScenario.briefing,
      conversationGoal: firstScenario.conversationGoal,
      scenarioEmoji: firstScenario.scenarioEmoji ?? null,
    });

    (['play', 'success', 'fail'] as const).forEach((type) => {
      const image = new Image();
      image.src = getScenarioImage(firstScenario.scenarioId, type);
    });

    markOnboardingComplete(member.userId);
    prefetchSession(firstScenario.scenarioId);
    router.replace(`/conversation/${firstScenario.scenarioId}`);
  }

  if (!isReady) return null;

  return (
    <main
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--onboarding-bg)', color: 'var(--onboarding-fg)' }}
    >
      <OnboardingHeader step={step} onBack={handleBack} />

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <StepMotion key="intro">
            <IntroStep onNext={() => goToStep('mic')} />
          </StepMotion>
        )}

        {step === 'mic' && (
          <StepMotion key="mic">
            <MicStep
              micState={micState}
              onAllow={requestMicrophonePermission}
              onOpenSettings={() => openNativeSettings()}
              isNative={webBridge.isAvailable()}
            />
          </StepMotion>
        )}

        {step === 'sound' && (
          <StepMotion key="sound">
            <SoundStep
              question={previewQuestion}
              translatedQuestion={previewTranslatedQuestion}
              isSpeaking={isSpeaking}
              onReplay={playQuestion}
              onNext={() => goToStep('scenario')}
            />
          </StepMotion>
        )}

        {step === 'scenario' && (
          <StepMotion key="scenario">
            <ScenarioStep
              scenario={firstScenario}
              isPending={isPending}
              errorMessage={error?.message ?? null}
              isUnlocked={scenarioUnlocked}
              onRetry={() => refetch()}
              onStart={startConversation}
            />
          </StepMotion>
        )}
      </AnimatePresence>
    </main>
  );
}

function OnboardingHeader({
  step,
  onBack,
}: {
  step: OnboardingStep;
  onBack: () => void;
}) {
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
              backgroundColor:
                index <= stepIndex ? 'var(--onboarding-fg)' : 'var(--onboarding-line)',
              opacity: index === stepIndex ? 0.95 : 0.6,
            }}
          />
        ))}
      </div>
    </header>
  );
}

function StepMotion({ children }: { children: ReactNode }) {
  return (
    <motion.section
      className="flex min-h-0 flex-1 flex-col px-6"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top), 18px) + 58px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
      }}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-9">
        <div className="space-y-4">
          <h1 className="text-[34px] font-black leading-[1.15] tracking-normal">
            영어 질문에 답하며
            <br />
            대화를 진행해보세요.
          </h1>
          <p className="text-[18px] font-medium leading-relaxed text-[var(--onboarding-muted)]">
            내 영어가 얼마나 전달되는지
            <br />
            확인할 수 있어요.
          </p>
        </div>

        <ChatPreview />
      </div>

      <Button onClick={onNext}>계속하기</Button>
    </>
  );
}

function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((current) => (current % CHAT_PREVIEW_MESSAGES.length) + 1);
    }, 1150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[330px] flex-col gap-3">
      {CHAT_PREVIEW_MESSAGES.map((message, index) => {
        const isVisible = index < visibleCount;
        const isUser = message.role === 'user';

        return (
          <motion.div
            key={message.text}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            animate={{ opacity: isVisible ? 1 : 0.22, y: isVisible ? 0 : 6 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className={`max-w-[78%] rounded-[22px] px-4 py-3 text-[15px] font-semibold leading-snug shadow-sm ${
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
    </div>
  );
}

function MicStep({
  micState,
  onAllow,
  onOpenSettings,
  isNative,
}: {
  micState: MicPermissionState;
  onAllow: () => void;
  onOpenSettings: () => void;
  isNative: boolean;
}) {
  const isDenied = micState === 'denied';

  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-4">
          <h1 className="text-[34px] font-black leading-[1.15] tracking-normal">
            실제 대화 연습을 위해
            <br />
            마이크 권한을 허용해주세요.
          </h1>
        </div>

        <div className="mx-auto w-full max-w-[318px] overflow-hidden rounded-[28px] border shadow-[0_18px_60px_rgba(0,0,0,0.12)]"
          style={{ backgroundColor: 'var(--onboarding-panel)', borderColor: 'var(--onboarding-line)' }}
        >
          <div className="space-y-4 px-5 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Mic size={25} />
            </div>
            <div className="space-y-2">
              <p className="text-[18px] font-extrabold leading-snug">
                SayNow에서 마이크를
                <br />
                사용하려고 합니다.
              </p>
              <p className="text-[14px] leading-relaxed text-[var(--onboarding-muted)]">
                영어 답변을 듣고 대화를 이어가기 위해 필요해요.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t text-[17px] font-bold" style={{ borderColor: 'var(--onboarding-line)' }}>
            <div className="border-r py-3.5 text-center text-[var(--onboarding-muted)]" style={{ borderColor: 'var(--onboarding-line)' }}>
              허용 안 함
            </div>
            <div className="py-3.5 text-center text-primary">허용</div>
          </div>
        </div>

        {isDenied && (
          <p className="text-center text-sm font-medium leading-relaxed text-[var(--onboarding-muted)]">
            마이크 권한이 꺼져 있어요.
            <br />
            설정에서 권한을 켠 뒤 계속할 수 있어요.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {isDenied && isNative && (
          <Button variant="ghost" onClick={onOpenSettings}>
            설정 열기
          </Button>
        )}
        <Button onClick={onAllow} loading={micState === 'requesting'}>
          허용
        </Button>
      </div>
    </>
  );
}

function SoundStep({
  question,
  translatedQuestion,
  isSpeaking,
  onReplay,
  onNext,
}: {
  question: string;
  translatedQuestion: string;
  isSpeaking: boolean;
  onReplay: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-4">
          <h1 className="text-[34px] font-black leading-[1.15] tracking-normal">
            이렇게 영어 질문을 듣게 돼요.
            <br />
            소리를 확인해주세요.
          </h1>
        </div>

        <div className="mx-auto w-full max-w-[326px] space-y-5 rounded-[28px] border p-5 shadow-[0_18px_60px_rgba(0,0,0,0.10)]"
          style={{ backgroundColor: 'var(--onboarding-panel)', borderColor: 'var(--onboarding-line)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Volume2 size={23} />
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-extrabold leading-snug">{question}</p>
              <p className="mt-1 text-sm leading-snug text-[var(--onboarding-muted)]">{translatedQuestion}</p>
            </div>
          </div>

          <div className="flex h-16 items-center justify-center gap-1.5 rounded-2xl" style={{ backgroundColor: 'var(--onboarding-panel-soft)' }}>
            {[16, 28, 42, 30, 20, 34, 24].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="w-1.5 rounded-full bg-primary"
                style={{
                  height,
                  animation: isSpeaking ? 'wave 0.58s ease-in-out infinite alternate' : undefined,
                  animationDelay: `${index * 0.07}s`,
                  opacity: isSpeaking ? 1 : 0.45,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onReplay}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary active:bg-primary/10"
          >
            <Volume2 size={18} />
            다시 듣기
          </button>
        </div>
      </div>

      <Button onClick={onNext}>잘 들려요</Button>
    </>
  );
}

function ScenarioStep({
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
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="space-y-4">
          <h1 className="text-[34px] font-black leading-[1.15] tracking-normal">
            첫 대화를
            <br />
            시작해볼까요?
          </h1>
        </div>

        {isPending ? (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--onboarding-muted)]">
            <LoaderCircle className="animate-spin" size={28} />
            <p className="text-sm font-semibold">시나리오를 불러오는 중이에요.</p>
          </div>
        ) : errorMessage ? (
          <div className="space-y-4 rounded-[24px] border p-5 text-center"
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
              className="overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_60px_rgba(0,0,0,0.10)]"
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
