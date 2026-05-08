// 피드백 페이지 — 대화 결과 이해도 및 발화별 상세 피드백
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFeedback, ApiFeedback, ApiTurnFeedback } from '@/lib/api';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [feedback, setFeedback] = useState<ApiFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      getSessionFeedback(id)
        .then((data) => {
          if (!cancelled) setFeedback(data);
        })
        .catch((e: Error) => {
          if (!cancelled) {
            if (e.message.includes('진행 중')) {
              setTimeout(poll, 2000);
            } else {
              setError(e.message);
            }
          }
        });
    }

    poll();
    return () => { cancelled = true; };
  }, [id]);

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

  if (!feedback) {
    return (
      <main className="flex h-full flex-col items-center justify-center bg-background gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">피드백 생성 중...</p>
      </main>
    );
  }

  const cleared = feedback.scenarioResult === 'SUCCESS';

  return (
    <main className="flex flex-col h-full bg-background">
      {/* 상단 헤더 — sticky 고정 */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-5 pt-10 pb-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {cleared ? '클리어! 🎉' : '아쉬워요 😅'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {feedback.summary}
            </p>
          </div>
          <div className="flex flex-col items-end ml-4 shrink-0">
            <span className={`text-5xl font-bold leading-none ${comprehensionColor(feedback.totalUnderstoodScore)}`}>
              {feedback.totalUnderstoodScore}%
            </span>
            <span className="text-xs text-muted-foreground mt-1">총 이해도</span>
          </div>
        </div>
      </div>

      {/* 발화별 카드 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3 pb-6">
        {feedback.turnFeedback.map((turn, i) => (
          <TurnCard key={turn.turnId} turn={turn} index={i} />
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

function TurnCard({ turn, index }: { turn: ApiTurnFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* 이해도 */}
      <div className={`px-4 pt-4 pb-3 flex items-center justify-between ${comprehensionBg(turn.understoodScore)}`}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${comprehensionColor(turn.understoodScore)}`}>
            {turn.understoodScore}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${comprehensionBadge(turn.understoodScore)}`}>
            {comprehensionLabel(turn.understoodScore)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">반응까지 {turn.speechStartedAfterSeconds}초</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Q */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Q{index + 1}. 외국인 질문</p>
          <p className="text-sm text-foreground leading-relaxed">{turn.questionText}</p>
        </div>

        {/* A */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">내 답변</p>
          <p className={`text-sm text-foreground leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {turn.userTranscript}
          </p>
          {turn.userTranscript.length > 60 && (
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
          <p className="text-sm text-foreground leading-relaxed">{turn.heardAs}</p>
        </div>

        {/* 더 나은 표현 */}
        {turn.scoreDelta > 0 && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-primary">더 나은 표현</p>
              <span className="text-xs font-bold text-primary bg-orange-100 px-2 py-0.5 rounded-full">
                +{turn.scoreDelta}%p
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">{turn.betterExpression}</p>
            {turn.reason && (
              <p className="text-xs text-muted-foreground mt-1.5">{turn.reason}</p>
            )}
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
