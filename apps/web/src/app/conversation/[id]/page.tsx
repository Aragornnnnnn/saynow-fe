// 대화 페이지 — 채팅 말풍선 UI로 시나리오 대화 연습
'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { startSession, submitUtterance, abandonSession, createFeedback } from '@/lib/api';
import { ensureAccessToken } from '@/lib/api/client';
import { feedbackQueryKeys } from '@/queries/feedback';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { startNativeStt, stopNativeStt } from '@/bridge/commands';
import { webBridge } from '@/bridge/webBridge';
import { useTts } from '@/hooks/useTts';
import { getScenarioImage } from '@/lib/scenarioImages';
import ExitConfirmModal from './ExitConfirmModal';
import MicDeniedModal from './MicDeniedModal';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { TypingDots } from '@/components/chat/TypingDots';
import { Button } from '@/components/ui/Button';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  translatedText?: string;
}

type PageState = 'loading' | 'idle' | 'recording' | 'stopping' | 'submitting' | 'navigating' | 'error';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMicDeniedModal, setShowMicDeniedModal] = useState(false);
  const [bgBlurred, setBgBlurred] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const { speak, stop } = useTts();
  const queryClient = useQueryClient();
  const isNative = webBridge.isAvailable();
  const sessionStartedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const stoppingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecording = pageState === 'recording';
  const [emptyToast, setEmptyToast] = useState(false);
  const keyboardOffset = useKeyboardOffset();

  useEffect(() => {
    if (keyboardOffset > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [keyboardOffset]);

  useEffect(() => {
    handleStartSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartSession() {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    setPageState('loading');
    try {
      await ensureAccessToken();
      const data = await startSession(Number(id));
      setSessionId(data.sessionId);
      setFeedbackAvailable(data.progress.completed);
      setMessages([
        {
          id: `ai-0`,
          role: 'ai',
          text: data.currentTurn.aiQuestion,
          translatedText: data.currentTurn.translatedQuestion,
        },
      ]);
      setPageState('idle');
    } catch (e) {
      setError((e as Error).message);
      setPageState('error');
    }
  }

  // AI 메시지 추가될 때마다 TTS 자동 재생 + 스크롤 + 첫 메시지에서 블러 트리거
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'ai' && lastMsg.text !== '...') {
      setBgBlurred(true);
      speak(lastMsg.text, null, {
        onStart: () => setSpeakingId(lastMsg.id),
        onEnd: () => setSpeakingId(null),
      });
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, speak]);

  useBackButtonBridge(() => {
    if (showExitModal) {
      setShowExitModal(false);
      return;
    }
    setShowExitModal(true);
  });

  async function submitUserUtterance(text: string) {
    if (!sessionId || pageState === 'submitting') return;
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text }]);
    setTranscript('');
    setPageState('submitting');

    try {
      const result = await submitUtterance(sessionId, text);

      // 마지막 답변 — ... 말풍선 → 마무리 멘트 → 결과 보기 버튼
      if (result.progress.completed) {
        const closingLines: [string, string][] = [
          ["Great job! Let's see how you did!", '수고했어요! 결과를 확인해봐요!'],
          ['Nice work! Check out your feedback!', '잘 하셨어요! 피드백을 확인해봐요!'],
          ['Well done! See how it sounded to a native speaker.', '훌륭해요! 원어민에게 어떻게 들렸는지 볼게요!'],
          ["That's a wrap! Let's check your results.", '대화 완료! 결과를 확인해봐요!'],
        ];
        const [closing, closingKo] = closingLines[Math.floor(Math.random() * closingLines.length)];
        queryClient.prefetchQuery({
          queryKey: feedbackQueryKeys.detail(sessionId),
          queryFn: () => createFeedback(sessionId),
        });
        // 피드백 페이지 진입 시 이미지 flash 방지 — 브라우저 캐시에 미리 올려둠
        (['success', 'fail'] as const).forEach((type) => {
          const img = new Image();
          img.src = getScenarioImage(Number(id), type);
        });
        await new Promise((r) => setTimeout(r, 1000));
        setPageState('idle');
        setMessages((prev) => [
          ...prev,
          { id: `ai-closing-${Date.now()}`, role: 'ai', text: closing, translatedText: closingKo },
        ]);
        await new Promise((r) => setTimeout(r, 400));
        setFeedbackAvailable(true);
        return;
      }

      const nextTurn = result.nextTurn;
      if (nextTurn) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'ai',
            text: nextTurn.aiQuestion,
            translatedText: nextTurn.translatedQuestion,
          },
        ]);
      }
      setPageState('idle');
    } catch (e) {
      setError((e as Error).message);
      setPageState('error');
    }
  }

  // 앱: 브릿지 STT 이벤트 구독
  useBridgeEvent(
    'STT_PARTIAL',
    useCallback((msg) => {
      setPageState((prev) => {
        if (prev !== 'recording') return prev;
        transcriptRef.current = msg.transcript;
        setTranscript(msg.transcript);
        return prev;
      });
    }, []),
  );

  useBridgeEvent(
    'STT_FINAL',
    useCallback(
      (msg) => {
        setPageState((prev) => {
          if (prev === 'stopping') {
            clearStoppingTimeout();
            const text = msg.transcript.trim();
            if (text && sessionId) {
              transcriptRef.current = text;
              setTranscript(text);
              setTimeout(() => submitUserUtterance(text), 0);
              return 'submitting';
            } else {
              setEmptyToast(true);
              return 'idle';
            }
          }
          if (prev === 'recording') {
            // silence detection 자동 종료 — transcript만 업데이트 (useStt에서 자동 재시작)
            transcriptRef.current = msg.transcript;
            setTranscript(msg.transcript);
          }
          return prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      },
      [sessionId],
    ),
  );

  // stopping 상태에서 3초 내 STT_FINAL 없으면 강제 idle 복구
  function startStoppingTimeout() {
    if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
    stoppingTimeoutRef.current = setTimeout(() => {
      setPageState((prev) => {
        if (prev !== 'stopping') return prev;
        const text = transcriptRef.current.trim();
        if (text && sessionId) {
          setTimeout(() => submitUserUtterance(text), 0);
          return 'submitting';
        }
        setEmptyToast(true);
        return 'idle';
      });
    }, 3000);
  }

  function clearStoppingTimeout() {
    if (stoppingTimeoutRef.current) {
      clearTimeout(stoppingTimeoutRef.current);
      stoppingTimeoutRef.current = null;
    }
  }

  useBridgeEvent(
    'STT_ERROR',
    useCallback(() => {
      clearStoppingTimeout();
      setPageState((prev) => {
        if (prev !== 'stopping' && prev !== 'recording') return prev;
        const text = transcriptRef.current.trim();
        if (text && sessionId) {
          setTimeout(() => submitUserUtterance(text), 0);
          return 'submitting';
        }
        setEmptyToast(true);
        return 'idle';
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]),
  );

  useBridgeEvent(
    'MIC_PERMISSION_DENIED',
    useCallback(() => {
      clearStoppingTimeout();
      setShowMicDeniedModal(true);
      setPageState('idle');
    }, []),
  );

  // 웹: 브라우저 SpeechRecognition
  async function startWebStt() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setShowMicDeniedModal(true);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const text = final || interim;
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') setShowMicDeniedModal(true);
      setPageState('idle');
    };

    recognition.start();
    recognitionRef.current = recognition;
    setPageState('recording');
    setTranscript('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  function stopWebStt() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  async function handleMicPress() {
    setEmptyToast(false);
    if (isRecording) {
      if (isNative) {
        // STT_FINAL 이벤트에서 최종 transcript 받은 후 제출
        setPageState('stopping');
        stopNativeStt();
        startStoppingTimeout();
      } else {
        stopWebStt();
        const text = transcriptRef.current.trim();
        if (!text || !sessionId) {
          setPageState('idle');
          setEmptyToast(true);
          return;
        }
        await submitUserUtterance(text);
      }
    } else {
      if (speakingId) {
        stop();
        setSpeakingId(null);
      }
      if (isNative) {
        transcriptRef.current = '';
        setTranscript('');
        startNativeStt();
        setPageState('recording');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      } else {
        await startWebStt();
      }
    }
  }

  function handleNext() {
    if (!feedbackAvailable || pageState === 'navigating') return;
    setPageState('navigating');
    router.push(`/feedback/${sessionId}?scenarioId=${id}`);
  }

  async function handleExit() {
    if (sessionId) await abandonSession(sessionId).catch(() => {});
    router.push('/');
  }

  function toggleTranslation(msgId: string) {
    setTranslatingId((prev) => (prev === msgId ? null : msgId));
  }

  if (pageState === 'error') {
    return (
      <main className='flex h-full items-center justify-center bg-background px-6'>
        <div className='space-y-4 text-center'>
          <p className='text-muted-foreground'>{error}</p>
          <button onClick={() => router.push('/')} className='text-sm font-medium text-primary'>
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  const bgImageUrl = getScenarioImage(Number(id), 'play');

  return (
    <motion.main
      className='relative flex h-dvh flex-col overflow-hidden bg-black'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* 배경 이미지 */}
      <div
        className='absolute inset-0 bg-cover bg-center transition-[filter] duration-[800ms] ease-in-out'
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          filter: bgBlurred ? 'blur(14px) brightness(0.35) saturate(0.8)' : 'none',
          transform: bgBlurred ? 'scale(1.06)' : 'scale(1)',
          transition: 'filter 800ms ease, transform 800ms ease',
          backgroundColor: '#a07860',
        }}
      />
      {/* 상단 그라데이션 — 항상 표시해서 헤더 가시성 보장 */}
      <div
        className='pointer-events-none absolute inset-x-0 top-0 z-10 h-48'
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)' }}
      />
      {/* 하단 그라데이션 — 블러 전환과 함께 등장 */}
      <motion.div
        className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-64'
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: bgBlurred ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      />

      {/* 상단 헤더 */}
      <div
        className='relative z-20 flex items-center px-4 pb-2'
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <button
          onClick={() => setShowExitModal(true)}
          className='flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white active:bg-black/50 transition-colors'
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className='no-scrollbar relative z-20 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-3'>
        <AnimatePresence>
          {bgBlurred && (
            <motion.p
              className='pointer-events-none text-center text-xs text-white/70'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              질문에 맞는 대답을 자연스럽게 이어가 보세요
            </motion.p>
          )}
        </AnimatePresence>
        {messages.map((msg) =>
          msg.role === 'ai' ? (
            <div key={msg.id}>
              <AiBubble
                text={msg.text}
                translatedText={msg.translatedText}
                showTranslation={translatingId === msg.id}
                isSpeaking={speakingId === msg.id}
                onToggleTranslation={() => toggleTranslation(msg.id)}
                onSpeak={() => {
                  if (speakingId === msg.id) {
                    stop();
                    setSpeakingId(null);
                  } else {
                    speak(msg.text, null, {
                      onStart: () => setSpeakingId(msg.id),
                      onEnd: () => setSpeakingId(null),
                    });
                  }
                }}
              />
            </div>
          ) : (
            <UserBubble key={msg.id} text={msg.text} />
          ),
        )}

        {/* AI 타이핑 중 */}
        {pageState === 'submitting' && (
          <div className='flex items-end gap-2'>
            <div className='max-w-[72%] rounded-2xl rounded-bl-md bg-[#EFEFEF] px-4 py-3'>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 하단 컨트롤 */}
      <div className='relative z-30 px-5 pt-2' style={{ paddingBottom: keyboardOffset > 0 ? `${keyboardOffset + 8}px` : '16px' }}>
        {/* STT transcript */}
        <AnimatePresence>
          {isRecording && (
            <motion.p
              key='transcript'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className='mb-2 text-center text-sm text-white/80 italic drop-shadow pointer-events-none'
            >
              {transcript || '듣고 있어요...'}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 빈 음성 말풍선 */}
        <AnimatePresence>
          {emptyToast && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className='relative mb-2 flex justify-center'
            >
              <div className='rounded-2xl bg-[#F5F5F3] px-4 py-2.5 text-sm font-medium text-foreground shadow-sm whitespace-nowrap'>
                목소리가 안 들렸어요, 다시 눌러서 말해주세요 🎤
              </div>
              {/* 아래 화살표 */}
              <div
                className='absolute -bottom-2 left-1/2 -translate-x-1/2'
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid #F5F5F3',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode='wait'>
          {feedbackAvailable ? (
            <motion.button
              key='feedback-btn'
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={handleNext}
              className='flex w-full items-center justify-center gap-2 h-14 rounded-2xl text-base font-bold text-white bg-primary shadow-[0_5px_0_#A85822] active:shadow-[0_2px_0_#A85822] active:translate-y-0.75 transition-transform duration-75'
            >
              {pageState === 'navigating' ? (
                <>
                  <span className='h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin' />
                  <span>이동 중...</span>
                </>
              ) : (
                '결과 보기'
              )}
            </motion.button>
          ) : (
            /* 마이크 버튼 */
            <motion.div key='mic-btn'>
              <Button
                onClick={handleMicPress}
                disabled={pageState === 'submitting' || pageState === 'stopping'}
                loading={pageState === 'submitting' || pageState === 'stopping'}
                variant={isRecording ? 'secondary' : 'primary'}
                className={isRecording ? 'shadow-none! translate-y-0!' : ''}
              >
                {pageState === 'submitting' || pageState === 'stopping' ? (
                  <span className='text-sm font-semibold text-white'>분석 중...</span>
                ) : isRecording ? (
                  <>
                    <div className='flex items-center gap-0.75'>
                      {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                        <span
                          key={i}
                          className='w-0.75 rounded-full bg-primary animate-[wave_0.6s_ease-in-out_infinite_alternate]'
                          style={{ height: `${h * 20}px`, animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className='text-sm font-semibold text-muted-foreground'>말하기가 끝나면 눌러주세요</span>
                  </>
                ) : (
                  <>
                    <Mic size={20} className='text-white' />
                    <span className='text-sm font-semibold text-white'>탭하여 말하기</span>
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showExitModal && <ExitConfirmModal onConfirm={handleExit} onCancel={() => setShowExitModal(false)} />}
      {showMicDeniedModal && (
        <MicDeniedModal isNative={!!window.ReactNativeWebView} onClose={() => setShowMicDeniedModal(false)} />
      )}

    </motion.main>
  );
}
