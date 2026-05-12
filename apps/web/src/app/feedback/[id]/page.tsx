// 피드백 페이지 — 대화 결과 이해도 및 발화별 상세 피드백
'use client';

import { use, useState } from 'react';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';
import type { ApiTurnFeedback } from '@/lib/api';
import { isFeedbackPending, useSessionFeedbackQuery } from '@/queries/feedback';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const feedbackQuery = useSessionFeedbackQuery(id);
  const feedback = feedbackQuery.data;
  const error = feedbackQuery.error;
  const isWaitingForFeedback = feedbackQuery.isPending || isFeedbackPending(error);
  const goHome = useBackButtonReplace('/');

  if (error && !isFeedbackPending(error)) {
    return (
      <main className="flex h-full items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error.message}</p>
          <button onClick={goHome} className="text-sm text-primary font-medium">
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (isWaitingForFeedback || !feedback) {
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
      <div className="sticky top-0 z-10 bg-card border-b border-border px-5 pt-4 pb-3 flex items-baseline justify-between">
        <p className="text-lg font-bold text-foreground">
          {cleared ? '클리어! ' : '아쉬워요 '}
          <span className="tossface">{cleared ? '🎉' : '😅'}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          총 이해도{' '}
          <span className={`text-2xl font-bold ${comprehensionStyle(feedback.totalUnderstoodScore).color}`}>
            {feedback.totalUnderstoodScore}%
          </span>
        </p>
      </div>

      {/* 발화별 카드 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3 pb-6">
        {/* 총평 카드 */}
        <div className="rounded-2xl bg-card border border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">총평</p>
          <p className={`text-sm text-muted-foreground ${summaryExpanded ? '' : 'line-clamp-2'}`}>
            {feedback.summary}
          </p>
          {feedback.summary.length > 80 && (
            <button
              onClick={() => setSummaryExpanded((v) => !v)}
              className="text-sm text-primary mt-1.5 font-medium py-1 pr-2"
            >
              {summaryExpanded ? '접기' : '자세히 보기'}
            </button>
          )}
        </div>
        {feedback.turnFeedback.map((turn, i) => (
          <TurnCard key={turn.turnId} turn={turn} index={i} />
        ))}
      </div>

      {/* 하단 나가기 버튼 */}
      <div className="px-4 py-3 bg-card border-t border-border">
        <button
          onClick={goHome}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity"
        >
          나가기
        </button>
      </div>
    </main>
  );
}

function TurnCard({ turn, index }: { turn: ApiTurnFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const s = comprehensionStyle(turn.understoodScore);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* 이해도 */}
      <div className={`px-4 pt-4 pb-3 flex items-center justify-between ${s.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${s.color}`}>
            {turn.understoodScore}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.badge}`}>
            {s.label}
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
              className="text-sm text-primary mt-1.5 font-medium py-1 pr-2"
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
        {turn.betterExpression && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-primary">더 나은 표현</p>
              {turn.improvedUnderstoodScore - turn.understoodScore > 0 && (
                <span className="text-xs font-bold text-primary bg-orange-100 px-2 py-0.5 rounded-full">
                  +{turn.improvedUnderstoodScore - turn.understoodScore}%p
                </span>
              )}
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

function comprehensionStyle(score: number) {
  if (score >= 70) return { color: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', label: '잘 전달됨' };
  if (score >= 40) return { color: 'text-orange-500', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-600', label: '보통' };
  return { color: 'text-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-600', label: '전달 어려움' };
}
