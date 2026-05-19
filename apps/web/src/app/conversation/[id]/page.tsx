// 대화 페이지 — 채팅 말풍선 UI로 시나리오 대화 연습
'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic, MicOff } from 'lucide-react';
import { startSession, submitUtterance, exitSession } from '@/lib/api';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { startNativeStt, stopNativeStt } from '@/bridge/commands';
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
}

type PageState = 'loading' | 'idle' | 'recording' | 'submitting' | 'error';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [remainingHearts, setRemainingHearts] = useState(3);
  const [isFeedbackAvailable, setIsFeedbackAvailable] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMicDeniedModal, setShowMicDeniedModal] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const { speak } = useTts();
  const isNative = webBridge.isAvailable();
  const sessionStartedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRecording = pageState === 'recording';

  // 세션 시작
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(Number(id))
      .then((data) => {
        setSessionId(data.sessionId);
        setRemainingHearts(data.remainingHearts);
        setIsFeedbackAvailable(data.isFeedbackAvailable);
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

  // 앱: 브릿지 STT 이벤트 구독
  useBridgeEvent('STT_PARTIAL', useCallback((msg) => {
    setTranscript(msg.transcript);
  }, []));

  useBridgeEvent('STT_FINAL', useCallback((msg) => {
    setTranscript(msg.transcript);
    setPageState('idle');
    if (msg.transcript.trim() && sessionId) {
      submitUserUtterance(msg.transcript.trim());
    }
  }, [sessionId])); // eslint-disable-line react-hooks/exhaustive-deps

  useBridgeEvent('MIC_PERMISSION_DENIED', useCallback(() => {
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        interim += event.results[i][0].transcript;
      }
      setTranscript(interim);
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
    if (isRecording) {
      if (isNative) {
        stopNativeStt();
      } else {
        stopWebStt();
        if (!transcript.trim() || !sessionId) {
          setPageState('idle');
          return;
        }
        await submitUserUtterance(transcript.trim());
      }
    } else {
      if (speakingId) {
        window.speechSynthesis?.cancel();
        setSpeakingId(null);
      }
      if (isNative) {
        startNativeStt();
        setPageState('recording');
        setTranscript('');
      } else {
        await startWebStt();
      }
    }
  }

  async function submitUserUtterance(text: string) {
    if (!sessionId) return;
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text }]);
    setTranscript('');
    setPageState('submitting');

    try {
      const result = await submitUtterance(sessionId, text);
      setRemainingHearts(result.remainingHearts);
      setIsFeedbackAvailable(result.isFeedbackAvailable);

      if (!result.isFeedbackAvailable && result.originalQuestion) {
        // AI 타이핑 애니메이션용 placeholder 추가 후 교체
        const aiMsgId = `ai-${Date.now()}`;
        setMessages((prev) => [...prev, { id: aiMsgId, role: 'ai', text: '...', translatedText: result.translatedQuestion }]);
        await new Promise((r) => setTimeout(r, 600));
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: result.originalQuestion } : m))
        );
      }
      setPageState('idle');
    } catch (e) {
      setError((e as Error).message);
      setPageState('error');
    }
  }

  async function handleNext() {
    if (!isFeedbackAvailable) return;
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
    <main className="flex h-full flex-col bg-background">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-12">
        <button
          onClick={() => setShowExitModal(true)}
          className="flex items-center gap-1 text-muted-foreground active:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        {/* 질문에 적절하지 않은 대답을 하면 하트가 깎여요 */}
        <p className="flex-1 text-center text-xs text-muted-foreground px-2">
          질문에 적절하지 않은 대답을 하면 하트가 깎여요
        </p>

        <div className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-base ${i < remainingHearts ? 'opacity-100' : 'opacity-20'}`}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-3">
        {messages.map((msg) => (
          msg.role === 'ai' ? (
            <AiBubble
              key={msg.id}
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
        {/* STT 텍스트 힌트 */}
        <div className="mb-3 min-h-6 text-center">
          {isRecording && (
            <p className="text-sm text-muted-foreground italic">
              {transcript || '듣고 있어요...'}
            </p>
          )}
        </div>

        {isFeedbackAvailable ? (
          /* 결과 보기 버튼 */
          <button
            onClick={handleNext}
            className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80 transition-opacity"
          >
            결과 보기
          </button>
        ) : (
          /* 마이크 버튼 */
          <div className="flex flex-col items-center gap-2">
            {pageState === 'submitting' && (
              <p className="text-xs text-muted-foreground">분석 중...</p>
            )}
            <button
              onClick={handleMicPress}
              disabled={pageState === 'submitting'}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all duration-150 active:scale-95 ${
                isRecording
                  ? 'bg-[#F0F0EE]'
                  : pageState === 'submitting'
                    ? 'bg-[#F0F0EE] opacity-50 cursor-not-allowed'
                    : 'bg-primary'
              }`}
            >
              {isRecording ? (
                <MicOff size={28} className="text-muted-foreground" />
              ) : (
                <Mic size={32} className="text-white" />
              )}
              {/* glow ring */}
              {isRecording && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              )}
            </button>
            {isRecording && (
              <p className="text-xs text-muted-foreground">🎙 마이크 켜서 다시 발화하기</p>
            )}
          </div>
        )}
      </div>

      {showExitModal && <ExitConfirmModal onConfirm={handleExit} onCancel={() => setShowExitModal(false)} />}
      {showMicDeniedModal && <MicDeniedModal isNative={!!window.ReactNativeWebView} onClose={() => setShowMicDeniedModal(false)} />}
    </main>
  );
}

