// 대화 페이지 — 시나리오별 외국인 대사를 순차적으로 연습하는 화면
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic, Square } from 'lucide-react';
import { startSession, submitTurn, recordMicReady, exitSession } from '@/lib/api';
import { useNativeBridge } from '@/hooks/useNativeBridge';
import { useAppStore } from '@/store/appStore';
import { useTts } from '@/hooks/useTts';
import ExitConfirmModal from './ExitConfirmModal';
import MicDeniedModal from './MicDeniedModal';

const CATEGORY_BG: Record<string, string> = {
  cafe: 'from-amber-900 via-amber-700 to-amber-500',
  airport: 'from-sky-900 via-sky-700 to-sky-500',
  hotel: 'from-indigo-900 via-indigo-700 to-indigo-500',
  restaurant: 'from-rose-900 via-rose-700 to-rose-500',
  taxi: 'from-yellow-900 via-yellow-700 to-yellow-500',
};

type RecordingState = 'idle' | 'recording' | 'done';

interface SessionState {
  sessionId: string | null;
  currentLine: string;
  currentTtsUrl: string | null;
  followUpCount: number;
  maxFollowUpCount: number;
  feedbackAvailable: boolean;
  categoryId: string;
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    currentLine: '',
    currentTtsUrl: null,
    followUpCount: 0,
    maxFollowUpCount: 5,
    feedbackAvailable: false,
    categoryId: '',
  });
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMicDeniedModal, setShowMicDeniedModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const micPermission = useAppStore((s) => s.micPermission);
  const turnStartedAtRef = useRef<number | null>(null);
  const speechStartedAfterMsRef = useRef(0);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(id)
      .then((data) => {
        turnStartedAtRef.current = Date.now();
        setSession({
          sessionId: data.sessionId,
          currentLine: data.babsaeText,
          currentTtsUrl: data.babsaeTtsUrl,
          maxFollowUpCount: data.maxFollowUpCount,
          feedbackAvailable: false,
          followUpCount: 0,
          categoryId: data.scenarioId.split('_')[0],
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const pendingRecordRef = useRef(false);

  const { speak } = useTts();
  const { startRecording, stopRecording, isNative, requestMicPermission } = useNativeBridge(
    async (base64) => {
      if (!session.sessionId) return;
      if (process.env.NODE_ENV === 'development') console.log('[Turn] base64 length:', base64?.length, 'sessionId:', session.sessionId, 'speechStartedAfterMs:', speechStartedAfterMsRef.current);
      try {
        const result = await submitTurn(session.sessionId, base64, speechStartedAfterMsRef.current);
        if (process.env.NODE_ENV === 'development') console.log('[Turn] result:', result);
        setTranscript(result.transcript);
        setRecordingState('done');
        setSession((s) => ({
          ...s,
          currentLine: result.babsaeText,
          currentTtsUrl: result.babsaeTtsUrl,
          followUpCount: result.followUpCount,
          feedbackAvailable: result.feedbackAvailable,
        }));
      } catch (e) {
        setError((e as Error).message);
        setRecordingState('idle');
      }
    },
    () => { pendingRecordRef.current = false; setShowMicDeniedModal(true); },
    () => { if (pendingRecordRef.current) { pendingRecordRef.current = false; startRecordingFlow(); } },
  );

  useEffect(() => {
    if (isNative) requestMicPermission();
  }, [isNative]); // eslint-disable-line react-hooks/exhaustive-deps

  // 뱁새 대사 TTS 자동 재생 — ttsUrl 있으면 네이티브, 없으면 Web Speech API
  useEffect(() => {
    if (session.currentLine) speak(session.currentLine, session.currentTtsUrl);
  }, [session.currentLine]); // eslint-disable-line react-hooks/exhaustive-deps

  const bgGradient = CATEGORY_BG[session.categoryId] ?? 'from-gray-900 via-gray-700 to-gray-500';
  const isLastTurn = session.feedbackAvailable || session.followUpCount >= session.maxFollowUpCount;
  const canProceed = recordingState === 'done';

  function startRecordingFlow() {
    if (process.env.NODE_ENV === 'development') console.log('[Mic] startRecordingFlow');
    speechStartedAfterMsRef.current = turnStartedAtRef.current ? Date.now() - turnStartedAtRef.current : 0;
    setRecordingState('recording');
    setTranscript('');
    startRecording();
    if (session.sessionId) recordMicReady(session.sessionId, speechStartedAfterMsRef.current).catch(() => {});
  }

  function handleMicPress() {
    if (process.env.NODE_ENV === 'development') console.log('[Mic] handleMicPress — state:', recordingState, 'permission:', micPermission);
    if (recordingState === 'idle') {
      if (micPermission === 'denied') { setShowMicDeniedModal(true); return; }
      if (micPermission === 'unknown') {
        pendingRecordRef.current = true;
        requestMicPermission();
        return;
      }
      startRecordingFlow();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  }

  function handleNext() {
    if (isLastTurn) {
      router.push(`/feedback/${session.sessionId}`);
    } else {
      turnStartedAtRef.current = Date.now();
      setRecordingState('idle');
      setTranscript('');
    }
  }

  async function handleExit() {
    if (session.sessionId) await exitSession(session.sessionId).catch(() => {});
    router.push('/');
  }

  if (error) {
    return (
      <main className="flex h-full items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm text-primary font-medium">돌아가기</button>
        </div>
      </main>
    );
  }

  if (!session.currentLine) {
    return (
      <main className="flex h-full items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className={`relative flex h-full flex-col bg-linear-to-b ${bgGradient} overflow-hidden`}>
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex items-center px-4 pt-12 pb-2">
        <button onClick={() => setShowExitModal(true)} className="flex items-center gap-1 text-white/80 active:text-white transition-colors">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">나가기</span>
        </button>
        <span className="ml-auto text-xs text-white/60 font-medium">
          {session.followUpCount} / {session.maxFollowUpCount}
        </span>
      </div>

      <div className="relative z-10 mx-4 mt-4">
        <div className="rounded-2xl bg-white/15 backdrop-blur-md px-5 py-4 border border-white/20">
          <p className="text-base font-medium text-white leading-relaxed">{session.currentLine}</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <span className="text-[120px] opacity-20 select-none">🗣️</span>
      </div>

      <div className="relative z-10 px-4 pb-10">
        <div className="mb-4 min-h-12 flex items-center justify-center">
          {recordingState === 'recording' && (
            <div className="flex items-center gap-3">
              <WaveAnimation />
              <span className="text-sm text-white/70 italic">듣고 있어요...</span>
            </div>
          )}
          {recordingState === 'done' && transcript && (
            <div className="rounded-xl bg-black/30 backdrop-blur-sm px-4 py-2 mx-2">
              <p className="text-sm text-white text-center leading-relaxed">{transcript}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleMicPress}
            disabled={recordingState === 'done'}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all duration-150 ${
              recordingState === 'recording' ? 'bg-red-500 animate-pulse'
              : recordingState === 'done' ? 'bg-white/30 cursor-not-allowed'
              : 'bg-primary'
            }`}
          >
            {recordingState === 'recording'
              ? <Square size={28} className="text-white" fill="white" />
              : <Mic size={32} className="text-white" />
            }
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full rounded-2xl py-4 text-base font-semibold transition-all duration-150 ${
            canProceed ? 'bg-primary text-white active:opacity-80' : 'bg-white/20 text-white/40 cursor-not-allowed'
          }`}
        >
          {isLastTurn ? '결과 보기' : '다음 질문'}
        </button>
      </div>

      {showExitModal && <ExitConfirmModal onConfirm={handleExit} onCancel={() => setShowExitModal(false)} />}
      {showMicDeniedModal && <MicDeniedModal isNative={isNative} onClose={() => setShowMicDeniedModal(false)} />}
    </main>
  );
}

function WaveAnimation() {
  return (
    <div className="flex items-center gap-0.75">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-0.75 rounded-full bg-primary"
          style={{ height: `${12 + (i % 3) * 8}px`, animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite alternate` }}
        />
      ))}
    </div>
  );
}
