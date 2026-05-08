// 대화 페이지 — 시나리오별 외국인 대사를 순차적으로 연습하는 화면
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic, Square } from 'lucide-react';
import { SCENARIOS, SCENARIO_TURNS } from '@/lib/scenarios';
import ExitConfirmModal from './ExitConfirmModal';

const CATEGORY_BG: Record<string, string> = {
  카페: 'from-amber-900 via-amber-700 to-amber-500',
  공항: 'from-sky-900 via-sky-700 to-sky-500',
  호텔: 'from-indigo-900 via-indigo-700 to-indigo-500',
  식당: 'from-rose-900 via-rose-700 to-rose-500',
  택시: 'from-yellow-900 via-yellow-700 to-yellow-500',
};

type RecordingState = 'idle' | 'recording' | 'done';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const scenario = SCENARIOS.find((s) => s.id === id);
  const turns = SCENARIO_TURNS[id] ?? [];
  const totalTurns = turns.length;

  const [turnIndex, setTurnIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);

  if (!scenario) {
    return (
      <main className="flex h-full items-center justify-center bg-background">
        <p className="text-muted-foreground">시나리오를 찾을 수 없습니다.</p>
      </main>
    );
  }

  const bgGradient = CATEGORY_BG[scenario.category] ?? 'from-gray-900 via-gray-700 to-gray-500';
  const currentTurn = turns[turnIndex];
  const isLastTurn = turnIndex === totalTurns - 1;
  const canProceed = recordingState === 'done';

  function handleMicPress() {
    if (recordingState === 'idle') {
      setRecordingState('recording');
      setTranscript('');
    } else if (recordingState === 'recording') {
      setRecordingState('done');
      // 실제 구현 시 여기서 AI 서버로 음성 전송
      setTranscript('I\'d like an iced americano, please.');
    }
  }

  function handleNext() {
    if (isLastTurn) {
      router.push(`/feedback/${id}`);
    } else {
      setTurnIndex((i) => i + 1);
      setRecordingState('idle');
      setTranscript('');
    }
  }

  return (
    <main className={`relative flex h-full flex-col bg-gradient-to-b ${bgGradient} overflow-hidden`}>
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
        {/* 진행 표시 */}
        <span className="ml-auto text-xs text-white/60 font-medium">
          {turnIndex + 1} / {totalTurns}
        </span>
      </div>

      {/* 외국인 대사 박스 */}
      <div className="relative z-10 mx-4 mt-4">
        <div className="rounded-2xl bg-white/15 backdrop-blur-md px-5 py-4 border border-white/20">
          <p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">
            {scenario.emoji} {scenario.category}
          </p>
          <p className="text-base font-medium text-white leading-relaxed">
            {currentTurn?.foreignerLine}
          </p>
        </div>
      </div>

      {/* 중앙 이모지 배경 장식 */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <span className="text-[120px] opacity-20 select-none">{scenario.emoji}</span>
      </div>

      {/* 하단 — 마이크 + 자막 + 버튼 */}
      <div className="relative z-10 px-4 pb-10">
        {/* STT 자막 */}
        <div className="mb-4 min-h-[48px] flex items-center justify-center">
          {recordingState === 'recording' && (
            <div className="flex items-center gap-3">
              {/* 음파 애니메이션 */}
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
          onConfirm={() => router.push('/')}
          onCancel={() => setShowExitModal(false)}
        />
      )}
    </main>
  );
}

function WaveAnimation() {
  return (
    <div className="flex items-center gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          style={{
            height: `${12 + (i % 3) * 8}px`,
            animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
