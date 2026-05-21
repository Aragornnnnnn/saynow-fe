// 대화 페이지 — 채팅 말풍선 UI로 시나리오 대화 연습
'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { startSession, submitUtterance, exitSession, createFeedback } from '@/lib/api';
import { feedbackQueryKeys } from '@/queries/feedback';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { startNativeStt, stopNativeStt, triggerHaptic } from '@/bridge/commands';
import { webBridge } from '@/bridge/webBridge';
import { useTts } from '@/hooks/useTts';
import ExitConfirmModal from './ExitConfirmModal';
import MicDeniedModal from './MicDeniedModal';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { TypingDots } from '@/components/chat/TypingDots';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  translatedText?: string;
  feedback?: string;
}

type PageState = 'loading' | 'idle' | 'recording' | 'stopping' | 'submitting' | 'error';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [remainingHearts, setRemainingHearts] = useState(3);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMicDeniedModal, setShowMicDeniedModal] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const { speak } = useTts();
  const queryClient = useQueryClient();
  const isNative = webBridge.isAvailable();
  const sessionStartedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const stoppingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecording = pageState === 'recording';
  const prevHeartsRef = useRef(3);
  const [heartShake, setHeartShake] = useState(false);
  const [emptyToast, setEmptyToast] = useState(false);
  const [redFlash, setRedFlash] = useState(false);

  // 하트 깎일 때 감지
  useEffect(() => {
    if (prevHeartsRef.current > remainingHearts) {
      setHeartShake(true);
      setRedFlash(true);
      triggerHaptic('medium');
      setTimeout(() => setHeartShake(false), 1000);
      setTimeout(() => setRedFlash(false), 400);
    }
    prevHeartsRef.current = remainingHearts;
  }, [remainingHearts]);

  // 세션 시작
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(Number(id))
      .then((data) => {
        setSessionId(data.sessionId);
        setRemainingHearts(data.remainingHearts);
        setFeedbackAvailable(data.feedbackAvailable);
        setMessages([
          {
            id: `ai-0`,
            role: 'ai',
            text: data.originalQuestion,
            translatedText: data.translatedQuestion,
          },
        ]);
        setPageState('idle');
      })
      .catch((e: Error) => {
        setError(e.message);
        setPageState('error');
      });
  }, [id]);

  // AI 메시지 추가될 때마다 TTS 자동 재생 + 스크롤
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'ai' && lastMsg.text !== '...') {
      speak(lastMsg.text, null, {
        onStart: () => setSpeakingId(lastMsg.id),
        onEnd: () => setSpeakingId(null),
      });
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, speak]);

  useBackButtonBridge(() => {
    if (showExitModal) { setShowExitModal(false); return; }
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

      // 하트 깎임 효과
      setRemainingHearts(result.remainingHearts);

      // 마지막 답변 — ... 말풍선 → 마무리 멘트 → 결과 보기 버튼
      if (result.feedbackAvailable) {
        const closingLines: [string, string][] = [
          ["Great job! Let's see how you did! 😊", "수고했어요! 결과를 확인해봐요!"],
          ["Nice work! Check out your feedback! 🎉", "잘 하셨어요! 피드백을 확인해봐요!"],
          ["Well done! See how it sounded to a native speaker 👀", "훌륭해요! 원어민에게 어떻게 들렸는지 볼게요!"],
          ["That's a wrap! Let's check your results ✨", "대화 완료! 결과를 확인해봐요!"],
        ];
        const [closing, closingKo] = closingLines[Math.floor(Math.random() * closingLines.length)];
        queryClient.prefetchQuery({
          queryKey: feedbackQueryKeys.detail(sessionId),
          queryFn: () => createFeedback(sessionId),
        });
        await new Promise((r) => setTimeout(r, 1000));
        setMessages((prev) => [...prev, { id: `ai-closing-${Date.now()}`, role: 'ai', text: closing, translatedText: closingKo }]);
        await new Promise((r) => setTimeout(r, 300));
        setFeedbackAvailable(true);
        setPageState('idle');
        return;
      }

      // 하트 깎임 시 1000ms 대기 후 다음 질문
      const heartsLost = prevHeartsRef.current > result.remainingHearts;
      if (heartsLost) await new Promise((r) => setTimeout(r, 1000));

      if (result.originalQuestion) {
        const feedbackText = heartsLost
          ? (result.remainingHearts === 0 ? '하트를 모두 잃었어요 😢' : '조금 더 질문에 맞게 답해보세요 😊')
          : undefined;
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: 'ai', text: result.originalQuestion, translatedText: result.translatedQuestion, feedback: feedbackText }]);
      }
      setPageState('idle');
    } catch (e) {
      setError((e as Error).message);
      setPageState('error');
    }
  }

  // 앱: 브릿지 STT 이벤트 구독
  useBridgeEvent('STT_PARTIAL', useCallback((msg) => {
    setPageState((prev) => {
      if (prev !== 'recording') return prev;
      transcriptRef.current = msg.transcript;
      setTranscript(msg.transcript);
      return prev;
    });
  }, []));

  useBridgeEvent('STT_FINAL', useCallback((msg) => {
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
  }, [sessionId]));

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

  useBridgeEvent('STT_ERROR', useCallback(() => {
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
  }, [sessionId]));

  useBridgeEvent('MIC_PERMISSION_DENIED', useCallback(() => {
    clearStoppingTimeout();
    setShowMicDeniedModal(true);
    setPageState('idle');
  }, []));

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
        window.speechSynthesis?.cancel();
        setSpeakingId(null);
      }
      if (isNative) {
        transcriptRef.current = '';
        setTranscript('');
        startNativeStt();
        setPageState('recording');
      } else {
        await startWebStt();
      }
    }
  }

  async function handleNext() {
    if (!feedbackAvailable) return;
    if (sessionId) await exitSession(sessionId).catch(() => {});
    router.push(`/feedback/${sessionId}`);
  }

  async function handleExit() {
    if (sessionId) await exitSession(sessionId).catch(() => {});
    router.push('/');
  }

  function toggleTranslation(msgId: string) {
    setTranslatingId((prev) => (prev === msgId ? null : msgId));
  }

  if (pageState === 'error') {
    return (
      <main className="flex h-full items-center justify-center bg-background px-6">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm font-medium text-primary">
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'loading') {
    return (
      <main className="flex h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="relative flex h-full flex-col bg-background overflow-hidden">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-6">
        <button
          onClick={() => setShowExitModal(true)}
          className="flex items-center gap-1 text-muted-foreground active:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="relative flex flex-col items-end">
          <motion.div
            animate={heartShake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex gap-0.5"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-base transition-opacity duration-300 ${i < (3 - remainingHearts) ? 'opacity-20' : 'opacity-100'}`}>
                ❤️
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* 하트 안내 — 첫 대화에서만 표시 */}
      <div className="h-5 px-4">
        {(
          <p className="text-center text-xs text-muted-foreground">
            질문에 맞는 대답을 해야 하트가 유지돼요
          </p>
        )}
      </div>

      {/* 그라데이션 테두리 플래시 */}
      <AnimatePresence>
        {redFlash && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 z-30"
            style={{ boxShadow: 'inset 0 0 40px 8px rgba(239,68,68,0.5), inset 0 0 80px 20px rgba(251,146,60,0.3)' }}
          />
        )}
      </AnimatePresence>

      {/* 채팅 메시지 영역 */}
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-3">
        {messages.map((msg) => (
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
                    window.speechSynthesis?.cancel();
                    setSpeakingId(null);
                  } else {
                    speak(msg.text, null, {
                      onStart: () => setSpeakingId(msg.id),
                      onEnd: () => setSpeakingId(null),
                    });
                  }
                }}
              />
              {msg.feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1.5 flex items-start gap-2"
                >
                  <div className="rounded-2xl rounded-tl-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-400">
                    {msg.feedback}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <UserBubble key={msg.id} text={msg.text} />
          )
        ))}

        {/* AI 타이핑 중 */}
        {pageState === 'submitting' && (
          <div className="flex items-end gap-2">
            <div className="max-w-[72%] rounded-2xl rounded-bl-sm bg-[#EFEFEF] px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 하단 컨트롤 */}
      <div className="px-4 pb-10 pt-2">
        {/* STT transcript */}
        <div className="mb-3 min-h-6 text-center">
          <AnimatePresence mode="wait">
            {isRecording && (
              <motion.p
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm text-muted-foreground italic"
              >
                {transcript || '듣고 있어요...'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* 빈 음성 말풍선 */}
        <AnimatePresence>
          {emptyToast && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="relative mb-2 flex justify-center"
            >
              <div className="rounded-2xl bg-[#F5F5F3] px-4 py-2.5 text-sm font-medium text-foreground shadow-sm whitespace-nowrap">
                목소리가 안 들렸어요, 다시 눌러서 말해주세요 🎤
              </div>
              {/* 아래 화살표 */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #F5F5F3' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
        {feedbackAvailable ? (
          <motion.button
            key="feedback-btn"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={handleNext}
            className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80 transition-opacity"
          >
            결과 보기
          </motion.button>
        ) : (
          /* 마이크 버튼 — 가로로 아이콘 + 텍스트 */
          <button
            onClick={handleMicPress}
            disabled={pageState === 'submitting' || pageState === 'stopping'}
            className={`relative flex w-full items-center justify-center gap-3 rounded-2xl py-4 shadow-md transition-all duration-150 active:scale-[0.98] ${
              isRecording
                ? 'bg-[#F0F0EE]'
                : pageState === 'submitting' || pageState === 'stopping'
                  ? 'bg-primary/60 cursor-not-allowed'
                  : 'bg-primary'
            }`}
          >
            {pageState === 'submitting' || pageState === 'stopping' ? (
              <>
                <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span className="text-sm font-semibold text-white">분석 중...</span>
              </>
            ) : isRecording ? (
              <>
                {/* 음파 바 */}
                <div className="flex items-center gap-0.75">
                  {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                    <span
                      key={i}
                      className="w-0.75 rounded-full bg-primary animate-[wave_0.6s_ease-in-out_infinite_alternate]"
                      style={{ height: `${h * 20}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-muted-foreground">말하기가 끝나면 눌러주세요</span>
              </>
            ) : (
              <>
                <Mic size={20} className="text-white" />
                <span className="text-sm font-semibold text-white">탭하여 말하기</span>
              </>
            )}
          </button>
        )}
        </AnimatePresence>
      </div>

      {showExitModal && <ExitConfirmModal onConfirm={handleExit} onCancel={() => setShowExitModal(false)} />}
      {showMicDeniedModal && <MicDeniedModal isNative={!!window.ReactNativeWebView} onClose={() => setShowMicDeniedModal(false)} />}
    </main>
  );
}

