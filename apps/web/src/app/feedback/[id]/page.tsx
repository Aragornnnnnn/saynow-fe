// 피드백 페이지 — 대화 결과 이해도 및 발화별 상세 피드백
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
// TODO: API 연동 시 MOCK_FEEDBACK, SCENARIOS 제거하고 아래 API로 교체
// GET /api/v1/sessions/{sessionId}/feedback → 피드백 데이터
// 202 FEEDBACK_GENERATING 응답 시 폴링 처리 필요 (일정 간격으로 재요청)
import { MOCK_FEEDBACK, TurnFeedback } from '@/lib/feedback';
import { SCENARIOS } from '@/lib/scenarios';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const feedback = MOCK_FEEDBACK[id] ?? MOCK_FEEDBACK['1'];
  const scenario = SCENARIOS.find((s) => s.id === id);

  return (
    <main className="flex flex-col h-full bg-background">
      {/* 상단 헤더 — sticky 고정 */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-5 pt-10 pb-5">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          {scenario?.emoji} {scenario?.title ?? '피드백'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {feedback.cleared ? '클리어! 🎉' : '아쉬워요 😅'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {feedback.cleared
                ? '외국인과의 대화를 성공적으로 마쳤어요.'
                : '다음엔 더 잘 할 수 있을 거예요.'}
            </p>
          </div>
          <div className="flex flex-col items-end ml-4 shrink-0">
            <span className={`text-5xl font-bold leading-none ${comprehensionColor(feedback.totalComprehension)}`}>
              {feedback.totalComprehension}%
            </span>
            <span className="text-xs text-muted-foreground mt-1">총 이해도</span>
          </div>
        </div>
      </div>

      {/* 발화별 카드 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3 pb-6">
        {feedback.turns.map((turn, i) => (
          <TurnCard key={i} turn={turn} index={i} />
        ))}
      </div>

      {/* 하단 나가기 버튼 */}
      <div className="px-4 pb-10 pt-3 bg-card border-t border-border">
        <button
          onClick={() => router.push('/')}
          className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80 transition-opacity"
        >
          나가기
        </button>
      </div>
    </main>
  );
}

function TurnCard({ turn, index }: { turn: TurnFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* 이해도 — 카드 최상단에서 바로 눈에 띄게 */}
      <div className={`px-4 pt-4 pb-3 flex items-center justify-between ${comprehensionBg(turn.comprehension)}`}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${comprehensionColor(turn.comprehension)}`}>
            {turn.comprehension}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${comprehensionBadge(turn.comprehension)}`}>
            {comprehensionLabel(turn.comprehension)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">반응까지 {turn.speakLatency}초</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Q */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Q{index + 1}. 외국인 질문</p>
          <p className="text-sm text-foreground leading-relaxed">{turn.question}</p>
        </div>

        {/* A */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">내 답변</p>
          <p className={`text-sm text-foreground leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {turn.myAnswer}
          </p>
          {turn.myAnswer.length > 60 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-primary mt-1 font-medium"
            >
              {expanded ? '접기' : '더보기'}
            </button>
          )}
        </div>

        {/* 귀에 이렇게 들렸어요 */}
        <div className="rounded-xl bg-muted/50 px-3 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">외국인 귀에 이렇게 들렸어요</p>
          <p className="text-sm text-foreground leading-relaxed">{turn.howItSounded}</p>
        </div>

        {/* 더 나은 표현 */}
        {turn.betterExpressionGain > 0 && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-primary">더 나은 표현</p>
              <span className="text-xs font-bold text-primary bg-orange-100 px-2 py-0.5 rounded-full">
                +{turn.betterExpressionGain}%p
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">{turn.betterExpression}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function comprehensionColor(score: number) {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function comprehensionBg(score: number) {
  if (score >= 70) return 'bg-green-50';
  if (score >= 40) return 'bg-orange-50';
  return 'bg-red-50';
}

function comprehensionBadge(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700';
  if (score >= 40) return 'bg-orange-100 text-orange-600';
  return 'bg-red-100 text-red-600';
}

function comprehensionLabel(score: number) {
  if (score >= 70) return '잘 전달됨';
  if (score >= 40) return '보통';
  return '전달 어려움';
}
