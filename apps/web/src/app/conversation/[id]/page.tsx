// 대화 페이지 — 채팅 말풍선 UI로 시나리오 대화 연습
'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Mic, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { startSession, submitUtterance, abandonSession, createFeedback } from '@/lib/api';
import { ensureAccessToken } from '@/lib/api/client';
import { feedbackQueryKeys } from '@/queries/feedback';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { prepareNativeStt, startNativeStt, stopNativeStt, stopNativeTts, STT_ENDPOINTING_MS } from '@/bridge/commands';
import { webBridge } from '@/bridge/webBridge';
import { useTts } from '@/hooks/useTts';
import { getScenarioImage } from '@/lib/scenarioImages';
import ExitConfirmModal from './ExitConfirmModal';
import MicDeniedModal from './MicDeniedModal';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { TypingDots } from '@/components/chat/TypingDots';
import { ThoughtOverlay, thoughtReadMs, type FloatingThought } from '@/components/chat/ThoughtOverlay';
import { Button } from '@/components/ui/Button';
import { track, EVENTS } from '@/lib/analytics';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  translatedText?: string;
}

type PageState = 'loading' | 'idle' | 'recording' | 'submitting' | 'navigating' | 'error';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  const [floatingThought, setFloatingThought] = useState<FloatingThought | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMicDeniedModal, setShowMicDeniedModal] = useState(false);
  const [bgBlurred, setBgBlurred] = useState(false);

  const searchParams = useSearchParams();
  // ── DEBUG ONLY: ?debug=1 일 때만 텍스트 입력 활성화 (테스트용, 제거 쉽게 분리) ──
  const isDebug = searchParams.get('debug') === '1';
  const [debugText, setDebugText] = useState('');
  // ── END DEBUG ──

  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const { speak, stop } = useTts();
  const queryClient = useQueryClient();
  const isNative = webBridge.isAvailable();
  const sessionStartedRef = useRef(false);
  const turnIndexRef = useRef(0);
  const sttEngineRef = useRef<'native' | 'web' | 'deepgram'>('web');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const sessionIdRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRecording = pageState === 'recording';
  const [emptyToast, setEmptyToast] = useState(false);

  useEffect(() => {
    handleStartSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 페이지 이탈 시 TTS·STT 정리 — 마이크/소리 누수 방지
  useEffect(() => {
    return () => {
      stop();
      if (isNative) {
        stopNativeStt();
        stopNativeTts();
      }
    };
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
      sessionIdRef.current = data.sessionId;
      setFeedbackAvailable(data.progress.completed);
      setMessages([
        {
          id: `ai-0`,
          role: 'ai',
          text: data.currentTurn.aiQuestion,
          translatedText: data.currentTurn.translatedQuestion,
        },
      ]);
      track(EVENTS.CONVERSATION_STARTED, { scenario_id: Number(id), session_id: data.sessionId });
      if (isNative) prepareNativeStt();
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
      speak(lastMsg.text, null);
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
      track(EVENTS.TURN_COMPLETED, { scenario_id: Number(id), session_id: sessionId, turn_index: turnIndexRef.current, stt_engine: sttEngineRef.current });
      turnIndexRef.current += 1;

      // 마지막 답변 — 종료 속마음(Sona) → AI 마무리 멘트(nextTurn) → 결과 보기 버튼
      if (result.progress.completed) {
        track(EVENTS.CONVERSATION_COMPLETED, { scenario_id: Number(id), session_id: sessionId });
        queryClient.prefetchQuery({
          queryKey: feedbackQueryKeys.detail(sessionId),
          queryFn: () => createFeedback(sessionId),
        });
        // 피드백 페이지 진입 시 이미지 flash 방지 — 브라우저 캐시에 미리 올려둠
        (['success', 'fail'] as const).forEach((type) => {
          const img = new Image();
          img.src = getScenarioImage(Number(id), type);
        });

        // 마지막 속마음 — Sona가 한 번 더 띄움
        const { innerThought, innerThoughtType } = result.submittedTurn;
        if (innerThought && innerThoughtType) {
          setFloatingThought({ text: innerThought, type: innerThoughtType });
          await new Promise((r) => setTimeout(r, thoughtReadMs(innerThought)));
          setFloatingThought(null);
          await new Promise((r) => setTimeout(r, 350));
        }

        // AI 마무리 멘트 — nextTurn으로 내려옴. 발화라 TTS로 읽힘.
        const closingTurn = result.nextTurn;
        if (closingTurn) {
          setMessages((prev) => [
            ...prev,
            { id: `ai-closing-${Date.now()}`, role: 'ai', text: closingTurn.aiQuestion, translatedText: closingTurn.translatedQuestion },
          ]);
          await new Promise((r) => setTimeout(r, 400));
        }
        // feedbackAvailable 먼저 → 마이크 버튼 순간 노출 방지 (await로 분리하지 않음)
        setFeedbackAvailable(true);
        setPageState('idle');
        return;
      }

      // 속마음 — 다음 질문 전에 화면 위로 잠깐 띄움. 메시지에 안 넣어 TTS도 안 읽힘.
      const { innerThought, innerThoughtType } = result.submittedTurn;
      if (innerThought && innerThoughtType) {
        setFloatingThought({ text: innerThought, type: innerThoughtType });
        await new Promise((r) => setTimeout(r, thoughtReadMs(innerThought)));
        setFloatingThought(null);
        await new Promise((r) => setTimeout(r, 350));
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
          if (prev === 'recording') {
            const text = msg.transcript.trim();
            transcriptRef.current = text;
            setTranscript(text);
            // 네이티브가 실제 사용한 엔진(deepgram/폴백 native) 반영
            if (msg.engine) sttEngineRef.current = msg.engine;
            // 1초 침묵 자동 종료 시 제출
            if (text && sessionId) {
              setTimeout(() => submitUserUtterance(text), 0);
              return 'submitting';
            }
          }
          return prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      },
      [sessionId],
    ),
  );

  useBridgeEvent(
    'STT_ERROR',
    useCallback(() => {
      setPageState((prev) => {
        if (prev !== 'recording') return prev;
        const text = transcriptRef.current.trim();
        if (text && sessionId) {
          setTimeout(() => submitUserUtterance(text), 0);
          return 'submitting';
        }
        track(EVENTS.EMPTY_RECORDING_SUBMITTED, { scenario_id: Number(id), session_id: sessionId });
        setEmptyToast(true);
        return 'idle';
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]),
  );

  useBridgeEvent(
    'MIC_PERMISSION_DENIED',
    useCallback(() => {
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
    recognition.continuous = false;
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

    recognition.onend = () => {
      recognitionRef.current = null;
      const text = transcriptRef.current.trim();
      const sid = sessionIdRef.current;
      if (text && sid) {
        submitUserUtterance(text);
      } else {
        setPageState((prev) => {
          if (prev === 'recording') {
            if (!text) { track(EVENTS.EMPTY_RECORDING_SUBMITTED, { scenario_id: Number(id), session_id: sid }); setEmptyToast(true); }
            return 'idle';
          }
          return prev;
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') setShowMicDeniedModal(true);
      setPageState('idle');
    };

    sttEngineRef.current = 'web';
    recognition.start();
    recognitionRef.current = recognition;
    setPageState('recording');
    setTranscript('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  function stopWebStt() {
    recognitionRef.current?.stop();
  }

  // ── Deepgram STT ──
  // 실패 시 fallbackStt()로 넘어감
  async function startDeepgramStt(fallbackStt: () => void): Promise<boolean> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // 권한 거부는 모달, getUserMedia 미지원(iOS WKWebView 등)은 폴백
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setShowMicDeniedModal(true);
        return false;
      }
      fallbackStt();
      return false;
    }

    const tokenRes = await fetch('/api/stt/token', { method: 'POST' });
    if (!tokenRes.ok) {
      fallbackStt();
      return false;
    }
    const { token } = (await tokenRes.json()) as { token: string };

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/ogg')
      ? 'audio/ogg'
      : '';

    const params = new URLSearchParams({
      model: 'nova-3',
      language: 'en-US',
      smart_format: 'true',
      interim_results: 'true',
      endpointing: String(STT_ENDPOINTING_MS),
      utterance_end_ms: String(STT_ENDPOINTING_MS),
      vad_events: 'true',
    });
    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['bearer', token]);
    deepgramSocketRef.current = ws;

    transcriptRef.current = '';

    ws.onopen = () => {
      sttEngineRef.current = 'deepgram';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      mr.start(250);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as {
        type: string;
        channel?: { alternatives: { transcript: string }[] };
        is_final?: boolean;
      };

      if (msg.type === 'Results' && msg.channel) {
        const text = msg.channel.alternatives[0]?.transcript ?? '';
        if (!text) return;
        if (msg.is_final) {
          transcriptRef.current = (transcriptRef.current + ' ' + text).trim();
          setTranscript(transcriptRef.current);
        } else {
          setTranscript((transcriptRef.current + ' ' + text).trim());
        }
      }

      // 침묵 감지 → 자동 종료
      if (msg.type === 'UtteranceEnd') {
        stopDeepgramStt();
      }
    };

    ws.onerror = () => {
      deepgramSocketRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      fallbackStt();
    };

    setPageState('recording');
    setTranscript('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    return true;
  }

  function stopDeepgramStt() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;

    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close();
      deepgramSocketRef.current = null;
    }

    const text = transcriptRef.current.trim();
    const sid = sessionIdRef.current;
    if (text && sid) {
      submitUserUtterance(text);
    } else {
      setPageState('idle');
      if (!text) { track(EVENTS.EMPTY_RECORDING_SUBMITTED, { scenario_id: Number(id), session_id: sessionId }); setEmptyToast(true); }
    }
  }
  // ── END Deepgram STT ──

  function startStt() {
    stop();
    transcriptRef.current = '';
    setTranscript('');
    if (isNative) {
      sttEngineRef.current = 'native';
      startNativeStt();
      setPageState('recording');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } else {
      // 웹 브라우저: Deepgram 먼저, 실패 시 브라우저 SpeechRecognition으로 폴백
      startDeepgramStt(startWebStt);
    }
  }

  function handleMicPress() {
    setEmptyToast(false);
    startStt();
  }

  function handleNext() {
    if (!feedbackAvailable || pageState === 'navigating') return;
    setPageState('navigating');
    router.push(`/feedback/${sessionId}?scenarioId=${id}`);
  }

  async function handleExit() {
    track(EVENTS.CONVERSATION_ABANDONED, { scenario_id: Number(id), session_id: sessionId });
    if (sessionId) await abandonSession(sessionId).catch(() => {});
    router.push('/home');
  }

  if (pageState === 'error') {
    return (
      <main className='flex h-full items-center justify-center bg-background px-6'>
        <div className='space-y-4 text-center'>
          <p className='text-muted-foreground'>{error}</p>
          <button onClick={() => router.push('/home')} className='text-sm font-medium text-primary'>
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  const bgImageUrl = getScenarioImage(Number(id));

  return (
    <motion.main
      className='relative flex h-dvh flex-col overflow-hidden bg-black'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* 배경 이미지 */}
      <div
        className='absolute inset-0 bg-cover bg-center'
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          filter: bgBlurred ? 'blur(40px) brightness(0.35) saturate(0.8)' : 'blur(3px) brightness(0.3)',
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
        className='relative z-20 flex items-center justify-between px-4 pb-2'
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <button
          onClick={() => setShowExitModal(true)}
          className='flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white active:bg-black/50 transition-colors'
        >
          <ChevronLeft size={20} />
        </button>

        <div />
      </div>

      {/* 채팅 메시지 영역 */}
      <div className='no-scrollbar relative z-20 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-3'>
        {messages.map((msg) =>
          msg.role === 'ai' ? (
            <AiBubble
              key={msg.id}
              text={msg.text}
              translatedText={msg.translatedText}
            />
          ) : (
            <UserBubble key={msg.id} text={msg.text} />
          ),
        )}

        {/* AI 타이핑 중 — 속마음 떠 있는 동안은 가림 */}
        {pageState === 'submitting' && !floatingThought && (
          <div className='flex items-end gap-2'>
            <div className='max-w-[72%] rounded-2xl rounded-bl-md bg-[#EFEFEF] px-4 py-3'>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 하단 컨트롤 */}
      <div className='relative z-30 px-5 pt-2 pb-4'>
        {/* transcript */}
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

        {/* 빈 음성 토스트 */}
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
              <div className='absolute -bottom-2 left-1/2 -translate-x-1/2'
                style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #F5F5F3' }}
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
              className='flex w-full items-center justify-center gap-2 h-14 rounded-2xl text-base font-bold text-white bg-primary shadow-[0_5px_0_#A85822] active:shadow-[0_2px_0_#A85822] active:translate-y-0.5 transition-transform duration-75'
            >
              {pageState === 'navigating' ? (
                <><span className='h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin' /><span>이동 중...</span></>
              ) : '결과 보기'}
            </motion.button>
          ) : pageState === 'submitting' ? (
            <motion.div key='submitting' className='flex h-14 items-center justify-center gap-2'>
              <span className='h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin' />
              <span className='text-sm font-semibold text-white/70'>분석 중...</span>
            </motion.div>
          ) : isRecording ? (
            /* 녹음 중 — 파형 + 취소 */
            <motion.div
              key='recording'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='flex items-center justify-between h-14 rounded-2xl bg-white/10 backdrop-blur-sm px-5'
            >
              <div className='flex items-center gap-[3px]'>
                {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                  <span key={i} className='w-[3px] rounded-full bg-white animate-[wave_0.6s_ease-in-out_infinite_alternate]'
                    style={{ height: `${h * 22}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <button
                onClick={() => {
                  track(EVENTS.RECORDING_CANCELLED, { scenario_id: Number(id), session_id: sessionId, stt_engine: sttEngineRef.current });
                  transcriptRef.current = '';
                  setTranscript('');
                  if (deepgramSocketRef.current) {
                    mediaRecorderRef.current?.stop();
                    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
                    mediaRecorderRef.current = null;
                    deepgramSocketRef.current.close();
                    deepgramSocketRef.current = null;
                    setPageState('idle');
                  } else if (isNative) {
                    stopNativeStt(); setPageState('idle');
                  } else {
                    stopWebStt(); setPageState('idle');
                  }
                }}
                className='text-sm font-semibold text-white/70 active:text-white transition-colors'
              >
                취소
              </button>
            </motion.div>
          ) : (
            /* idle — 말하기 버튼 (+ debug 텍스트 입력) */
            <motion.div key='idle' className='space-y-2'>
              {/* ── DEBUG ONLY: 텍스트로 제출 (제거 시 이 블록만 삭제) ── */}
              {isDebug && (
                <div className='flex gap-2'>
                  <input
                    className='flex-1 rounded-xl bg-white/90 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none'
                    placeholder='텍스트로 입력 (debug)'
                    value={debugText}
                    onChange={(e) => setDebugText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && debugText.trim()) {
                        submitUserUtterance(debugText.trim());
                        setDebugText('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (debugText.trim()) {
                        submitUserUtterance(debugText.trim());
                        setDebugText('');
                      }
                    }}
                    className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white'
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
              {/* ── END DEBUG ── */}
              <Button onClick={handleMicPress}>
                <Mic size={20} className='text-white' />
                <span className='text-sm font-semibold text-white'>말하기</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 속마음 플로팅 반응 */}
      <ThoughtOverlay thought={floatingThought} />

      {showExitModal && <ExitConfirmModal onConfirm={handleExit} onCancel={() => setShowExitModal(false)} />}
      {showMicDeniedModal && (
        <MicDeniedModal isNative={!!window.ReactNativeWebView} onClose={() => setShowMicDeniedModal(false)} />
      )}

    </motion.main>
  );
}
