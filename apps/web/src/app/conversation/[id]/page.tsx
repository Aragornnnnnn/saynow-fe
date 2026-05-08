// 대화 페이지 — 시나리오별 외국인 대사를 순차적으로 연습하는 화면
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic, Square } from 'lucide-react';
import { startSession, submitTurn, recordMicReady, exitSession } from '@/lib/api';
import { useNativeBridge } from '@/hooks/useNativeBridge';
import { useAppStore } from '@/store/appStore';
import ExitConfirmModal from './ExitConfirmModal';

const CATEGORY_BG: Record<string, string> = {
  cafe: 'from-amber-900 via-amber-700 to-amber-500',
  airport: 'from-sky-900 via-sky-700 to-sky-500',
  hotel: 'from-indigo-900 via-indigo-700 to-indigo-500',
  restaurant: 'from-rose-900 via-rose-700 to-rose-500',
  taxi: 'from-yellow-900 via-yellow-700 to-yellow-500',
};

type RecordingState = 'idle' | 'recording' | 'done';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState('');
  const [followUpCount, setFollowUpCount] = useState(0);
  const [maxFollowUpCount, setMaxFollowUpCount] = useState(5);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMicDeniedModal, setShowMicDeniedModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const micPermission = useAppStore((s) => s.micPermission);
  const micPressedAtRef = useRef<number | null>(null);
  const speechStartedAfterMsRef = useRef(0);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(id)
      .then((data) => {
        setSessionId(data.sessionId);
        setCurrentLine(data.babsaeText);
        setMaxFollowUpCount(data.maxFollowUpCount);
        setCategoryId(data.scenarioId.split('_')[0]);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const { startRecording, stopRecording, isNative } = useNativeBridge(
    async (uri) => {
      if (!sessionId) return;
      try {
        const result = await submitTurn(sessionId, uri, speechStartedAfterMsRef.current);
        setTranscript(result.transcript);
        setRecordingState('done');
        setCurrentLine(result.babsaeText);
        setFollowUpCount(result.followUpCount);
        setFeedbackAvailable(result.feedbackAvailable);
      } catch (e) {
        setError((e as Error).message);
        setRecordingState('idle');
      }
    },
    () => setShowMicDeniedModal(true),
  );

  const bgGradient = CATEGORY_BG[categoryId] ?? 'from-gray-900 via-gray-700 to-gray-500';
  const isLastTurn = feedbackAvailable || followUpCount >= maxFollowUpCount;
  const canProceed = recordingState === 'done';

  function handleMicPress() {
    if (micPermission === 'denied') {
      setShowMicDeniedModal(true);
      return;
    }
    if (recordingState === 'idle') {
      micPressedAtRef.current = Date.now();
      setRecordingState('recording');
      setTranscript('');
      startRecording();
      if (sessionId) {
        recordMicReady(sessionId, 0);
      }
    } else if (recordingState === 'recording') {
      speechStartedAfterMsRef.current = micPressedAtRef.current
        ? Date.now() - micPressedAtRef.current
        : 0;
      stopRecording();
    }
  }

  function handleNext() {
    if (isLastTurn) {
      router.push(`/feedback/${sessionId}`);
    } else {
      setRecordingState('idle');
      setTranscript('');
    }
  }

  async function handleExit() {
    if (sessionId) await exitSession(sessionId).catch(() => {});
    router.push('/');
  }

  if (error) {
    return (
      <main className="flex h-full items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm text-primary font-medium">
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (!currentLine) {
    return (
      <main className="flex h-full items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className={`relative flex h-full flex-col bg-linear-to-b ${bgGradient} overflow-hidden`}>
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/30" />

      {/* 상단 — 나가기 버튼 */}
      <div className="relative z-10 flex items-center px-4 pt-12 pb-2">
        <button
          onClick={() => setShowExitModal(true)}
          className="flex items-center gap-1 text-white/80 active:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">나가기</span>
        </button>
        <span className="ml-auto text-xs text-white/60 font-medium">
          {followUpCount} / {maxFollowUpCount}
        </span>
      </div>

      {/* 외국인 대사 박스 */}
      <div className="relative z-10 mx-4 mt-4">
        <div className="rounded-2xl bg-white/15 backdrop-blur-md px-5 py-4 border border-white/20">
          <p className="text-base font-medium text-white leading-relaxed">{currentLine}</p>
        </div>
      </div>

      {/* 중앙 장식 */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <span className="text-[120px] opacity-20 select-none">🗣️</span>
      </div>

      {/* 하단 — 마이크 + 자막 + 버튼 */}
      <div className="relative z-10 px-4 pb-10">
        {/* STT 자막 */}
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

        {/* 마이크 버튼 */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleMicPress}
            disabled={recordingState === 'done'}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center
              shadow-lg active:scale-95 transition-all duration-150
              ${recordingState === 'recording'
                ? 'bg-red-500 animate-pulse'
                : recordingState === 'done'
                  ? 'bg-white/30 cursor-not-allowed'
                  : 'bg-primary'
              }
            `}
          >
            {recordingState === 'recording'
              ? <Square size={28} className="text-white" fill="white" />
              : <Mic size={32} className="text-white" />
            }
          </button>
        </div>

        {/* 다음 질문 / 결과 보기 버튼 */}
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`
            w-full rounded-2xl py-4 text-base font-semibold transition-all duration-150
            ${canProceed
              ? 'bg-primary text-white active:opacity-80'
              : 'bg-white/20 text-white/40 cursor-not-allowed'
            }
          `}
        >
          {isLastTurn ? '결과 보기' : '다음 질문'}
        </button>
      </div>

      {showExitModal && (
        <ExitConfirmModal
          onConfirm={handleExit}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {showMicDeniedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowMicDeniedModal(false)}>
          <div className="mx-6 w-full max-w-sm rounded-2xl bg-card px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-foreground mb-2">마이크 권한이 필요해요</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              영어 회화 연습을 위해 마이크 접근 권한이 필요해요. 설정에서 권한을 허용해주세요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMicDeniedModal(false)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground"
              >
                닫기
              </button>
              {isNative && (
                <button
                  onClick={() => {
                    setShowMicDeniedModal(false);
                    window.ReactNativeWebView?.postMessage('OPEN_SETTINGS');
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white"
                >
                  설정으로 이동
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
          style={{
            height: `${12 + (i % 3) * 8}px`,
            animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
