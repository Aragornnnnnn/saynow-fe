'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, LoaderCircle, Lock } from 'lucide-react';
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
type PermissionPreviewPlatform = 'ios' | 'android';

const STEP_ORDER: OnboardingStep[] = ['intro', 'sound', 'mic', 'scenario'];
const FALLBACK_QUESTION = 'Hey! Can you hear me alright?';
const FALLBACK_TRANSLATED_QUESTION = '잘 들려요?';
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

  const previewQuestion = FALLBACK_QUESTION;
  const previewTranslatedQuestion = FALLBACK_TRANSLATED_QUESTION;

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

  const [soundBubbleVisible, setSoundBubbleVisible] = useState(false);

  function playDing() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  const playQuestion = useCallback(() => {
    speak(previewQuestion, null, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, [previewQuestion, speak]);

  const handleSoundPlay = useCallback(() => {
    playDing();
    if (!soundBubbleVisible) {
      setTimeout(() => {
        setSoundBubbleVisible(true);
        setTimeout(() => playQuestion(), 400);
      }, 300);
    } else {
      setTimeout(() => playQuestion(), 300);
    }
  }, [soundBubbleVisible, playQuestion]);

  useEffect(() => {
    if (step !== 'sound') return;
    const timer = setTimeout(() => handleSoundPlay(), 600);
    return () => {
      clearTimeout(timer);
      stop();
      setIsSpeaking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
          goToStep('scenario');
        }
      }, 700);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState('idle');
      goToStep('scenario');
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
            <IntroStep onNext={() => goToStep('sound')} />
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
              bubbleVisible={soundBubbleVisible}
              onReplay={handleSoundPlay}
              onNext={() => goToStep('mic')}
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
  const [previewPlatform, setPreviewPlatform] = useState<PermissionPreviewPlatform>('ios');

  useEffect(() => {
    if (/Android/i.test(navigator.userAgent)) {
      setPreviewPlatform('android');
    }
  }, []);

  return (
    <>
      <div className="flex flex-1 flex-col pt-7">
        <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
          이번엔 마이크를 켜서
          <br />
          제가 들을 수 있게 해주세요
        </h1>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-8">
          <PermissionPreview
            platform={previewPlatform}
            isRequesting={micState === 'requesting'}
            onAllow={onAllow}
          />

          {isDenied && (
            <p className="text-center text-sm font-medium leading-relaxed text-[var(--onboarding-muted)]">
              마이크 권한이 꺼져 있어요.
              <br />
              설정에서 권한을 켠 뒤 계속할 수 있어요.
            </p>
          )}
        </div>
      </div>

      {isDenied && isNative && (
        <Button variant="ghost" onClick={onOpenSettings}>
          설정 열기
        </Button>
      )}
    </>
  );
}

function PermissionPreview({
  platform,
  isRequesting,
  onAllow,
}: {
  platform: PermissionPreviewPlatform;
  isRequesting: boolean;
  onAllow: () => void;
}) {
  if (platform === 'android') {
    return <AndroidPermissionPreview isRequesting={isRequesting} onAllow={onAllow} />;
  }
  return <IosPermissionPreview isRequesting={isRequesting} onAllow={onAllow} />;
}

function IosPermissionPreview({
  isRequesting,
  onAllow,
}: {
  isRequesting: boolean;
  onAllow: () => void;
}) {
  return (
    <div className="relative mx-auto w-[310px] overflow-visible">
      <div
        className="overflow-hidden rounded-[16px] border bg-white backdrop-blur-xl"
        style={{ backgroundColor: 'var(--onboarding-panel)', borderColor: 'var(--onboarding-line)' }}
      >
        <div className="px-5 pb-5 pt-6 text-center">
          <div className="space-y-2">
            <p className="text-[19px] font-semibold leading-snug">
              'SayNow'이(가)
              <br />
              마이크에 접근하려고 합니다.
            </p>
            <p className="text-[14px] leading-snug text-[var(--onboarding-muted)]">
              음성 답변을 듣고 대화를 이어가기 위해 필요합니다.
            </p>
          </div>
        </div>
        <div
          className="grid h-13 grid-cols-2 border-t text-[18px]"
          style={{ borderColor: 'var(--onboarding-line)' }}
        >
          <div
            className="flex items-center justify-center border-r text-[18px] text-[#007AFF] opacity-60"
            style={{ borderColor: 'var(--onboarding-line)' }}
          >
            허용 안 함
          </div>
          <button
            type="button"
            onClick={onAllow}
            disabled={isRequesting}
            className="flex items-center justify-center font-semibold text-[#007AFF] disabled:opacity-50"
          >
            허용
          </button>
        </div>
      </div>
      <span className="tossface pointer-events-none absolute -bottom-9 right-[45px] text-[40px] leading-none">
        👆
      </span>
    </div>
  );
}

function AndroidPermissionPreview({
  isRequesting,
  onAllow,
}: {
  isRequesting: boolean;
  onAllow: () => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[326px]">
      <div className="rounded-[30px] bg-white px-6 pb-5 pt-6 text-center text-[#202124]">
        <div className="mx-auto mb-5 flex h-7 w-10 items-center justify-center rounded-md bg-[#4D72F5]">
          <span className="h-3 w-3 rounded-full bg-white" />
          <span className="-ml-0.5 h-1.5 w-1.5 rounded-full bg-white/80" />
        </div>

        <p className="mx-auto max-w-[264px] text-[16px] font-semibold leading-snug">
          SayNow에서 오디오를 녹음하도록 허용하시겠습니까?
        </p>

        <div className="mt-7 space-y-1 text-[20px] font-bold leading-none">
          <button
            type="button"
            onClick={onAllow}
            disabled={isRequesting}
            className="relative flex h-14 w-full items-center justify-center disabled:opacity-50"
          >
            앱 사용 중에만 허용
            <span className="tossface pointer-events-none absolute right-0 text-[34px] leading-none">👈</span>
          </button>
          <div className="flex h-14 items-center justify-center">이번만 허용</div>
          <div className="flex h-14 items-center justify-center">허용 안함</div>
        </div>
      </div>
    </div>
  );
}

function SoundStep({
  question,
  isSpeaking,
  bubbleVisible,
  onReplay,
  onNext,
}: {
  question: string;
  translatedQuestion: string;
  isSpeaking: boolean;
  bubbleVisible: boolean;
  onReplay: () => void;
  onNext: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const duration = Math.max(3000, question.length * 80);

  useEffect(() => {
    if (isSpeaking) {
      setHasPlayed(true);
      startTimeRef.current = Date.now();
      const tick = () => {
        const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
        const p = Math.min((elapsed / duration) * 100, 98);
        setProgress(p);
        if (p < 98) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hasPlayed) setProgress(100);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  return (
    <>
      <div className="flex flex-1 flex-col pt-7">
        <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
          대화를 위해 제가
          <br />
          이렇게 말을 걸게요
        </h1>

        <div className="flex flex-1 flex-col justify-center gap-8">
          {/* 채팅 말풍선 */}
          <div className="min-h-[56px] flex flex-col justify-end">
            <AnimatePresence>
              {bubbleVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="self-start max-w-[85%] rounded-[20px] rounded-tl-md px-4 py-3"
                  style={{ backgroundColor: 'var(--onboarding-panel)' }}
                >
                  <p className="text-[17px] font-semibold leading-snug">{question}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 진행 바 + 컨트롤 */}
          <div className="space-y-4">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--onboarding-line)' }}>
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear', duration: 0.1 }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--onboarding-muted)]">
                {isSpeaking ? '재생 중' : hasPlayed ? '' : bubbleVisible ? '볼륨을 올리고 들어보세요 🔊' : ''}
              </p>
              <button
                type="button"
                onClick={onReplay}
                disabled={isSpeaking}
                className="flex items-center gap-1.5 text-sm font-semibold text-[var(--onboarding-muted)] disabled:opacity-0 transition-opacity active:opacity-50"
              >
                {hasPlayed ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    </svg>
                    다시 듣기
                  </>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '1px' }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={onNext} disabled={!hasPlayed}>
        잘 들려요
      </Button>
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
