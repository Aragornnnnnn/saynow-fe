// 온보딩 플로우 — 스텝 상태 관리 및 라우팅
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { openNativeSettings, startNativeStt, stopNativeStt } from '@/bridge/commands';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { webBridge } from '@/bridge/webBridge';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTts } from '@/hooks/useTts';
import { prefetchSession, type ApiScenario } from '@/lib/api';
import { markOnboardingComplete } from '@/lib/onboarding';
import { useScenariosQuery } from '@/queries/scenarios';
import { useAuthStore } from '@/store/authStore';
import { useScenarioStore } from '@/store/scenarioStore';
import { OnboardingHeader } from './_components/OnboardingHeader';
import { StepMotion } from './_components/StepMotion';
import { IntroStep } from './_steps/IntroStep';
import { SoundStep } from './_steps/SoundStep';
import { MicStep } from './_steps/MicStep';
import { ThoughtStep } from './_steps/ThoughtStep';
import { ScenarioStep } from './_steps/ScenarioStep';
import { STEP_ORDER, FALLBACK_QUESTION, SOUND_QUESTIONS, type OnboardingStep, type MicPermissionState } from './_types';
import { track, EVENTS } from '@/lib/analytics';

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
  const [soundBubbleVisible, setSoundBubbleVisible] = useState(false);
  const [soundQuestion, setSoundQuestion] = useState(FALLBACK_QUESTION);
  const lastQuestionIndexRef = useRef(0);
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micDeniedRef = useRef(false);

  const firstScenario = useMemo(
    () => data?.categories.flatMap((c) => c.scenarios).find((s) => !s.locked) ?? null,
    [data],
  );

  const goToStep = useCallback((nextStep: OnboardingStep) => setStep(nextStep), []);

  const handleBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) setStep(STEP_ORDER[currentIndex - 1]);
  }, [step]);

  useBackButtonBridge(handleBack);

  useEffect(() => {
    track(EVENTS.ONBOARDING_STARTED);
  }, []);

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

  const soundStepActiveRef = useRef(false);
  const playQuestionRef = useRef<(isRepeat?: boolean) => void>(() => {});

  const playQuestion = useCallback((isRepeat = false) => {
    const nextQuestion = (() => {
      if (!isRepeat) return FALLBACK_QUESTION;
      let idx = lastQuestionIndexRef.current;
      do { idx = Math.floor(Math.random() * SOUND_QUESTIONS.length); }
      while (idx === lastQuestionIndexRef.current && SOUND_QUESTIONS.length > 1);
      lastQuestionIndexRef.current = idx;
      return SOUND_QUESTIONS[idx];
    })();

    if (isRepeat) {
      setSoundBubbleVisible(false);
      setTimeout(() => {
        setSoundQuestion(nextQuestion);
        setSoundBubbleVisible(true);
        playDing();
        setIsSpeaking(true);
        speak(nextQuestion, null, {
          onEnd: () => {
            setIsSpeaking(false);
            if (soundStepActiveRef.current) {
              setTimeout(() => { if (soundStepActiveRef.current) playQuestionRef.current(true); }, 1400);
            }
          },
        });
      }, 300);
      return;
    }
    setIsSpeaking(true);
    speak(nextQuestion, null, {
      onEnd: () => {
        setIsSpeaking(false);
        if (soundStepActiveRef.current) {
          setTimeout(() => { if (soundStepActiveRef.current) playQuestionRef.current(true); }, 1400);
        }
      },
    });
  }, [speak]);

  playQuestionRef.current = playQuestion;

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
    soundStepActiveRef.current = true;
    const timer = setTimeout(() => handleSoundPlay(), 600);
    return () => {
      soundStepActiveRef.current = false;
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
      track(EVENTS.MICROPHONE_PERMISSION_DENIED);
      setMicState('denied');
    }, []),
  );

  async function requestMicrophonePermission() {
    setMicState('requesting');
    micDeniedRef.current = false;
    track(EVENTS.MICROPHONE_PERMISSION_PROMPTED);

    if (webBridge.isAvailable()) {
      startNativeStt();
      micTimerRef.current = setTimeout(() => {
        stopNativeStt();
        if (!micDeniedRef.current) {
          track(EVENTS.MICROPHONE_PERMISSION_GRANTED);
          track(EVENTS.ONBOARDING_STEP_COMPLETED, { step_name: 'mic' });
          setMicState('idle');
          goToStep('thought');
        }
      }, 700);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      track(EVENTS.MICROPHONE_PERMISSION_GRANTED);
      track(EVENTS.ONBOARDING_STEP_COMPLETED, { step_name: 'mic' });
      setMicState('idle');
      goToStep('thought');
    } catch {
      track(EVENTS.MICROPHONE_PERMISSION_DENIED);
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

    track(EVENTS.ONBOARDING_COMPLETED);
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
            <IntroStep nickname={member?.nickname ?? ''} onNext={() => { track(EVENTS.ONBOARDING_STEP_COMPLETED, { step_name: 'intro' }); goToStep('sound'); }} />
          </StepMotion>
        )}

        {step === 'sound' && (
          <StepMotion key="sound">
            <SoundStep
              question={soundQuestion}
              isSpeaking={isSpeaking}
              bubbleVisible={soundBubbleVisible}
              onNext={() => { track(EVENTS.ONBOARDING_STEP_COMPLETED, { step_name: 'sound' }); goToStep('mic'); }}
            />
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

        {step === 'thought' && (
          <StepMotion key="thought">
            <ThoughtStep onNext={() => { track(EVENTS.ONBOARDING_STEP_COMPLETED, { step_name: 'thought' }); goToStep('scenario'); }} />
          </StepMotion>
        )}

        {step === 'scenario' && (
          <StepMotion key="scenario">
            <ScenarioStep
              scenario={firstScenario as ApiScenario | null}
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
