// 피드백 페이지 — 대화 결과 이해도 및 발화별 상세 피드백
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiTurnFeedback } from '@/lib/api';
import { useFeedbackQuery } from '@/queries/feedback';

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const feedbackQuery = useFeedbackQuery(Number(id));
  const feedback = feedbackQuery.data;
  const error = feedbackQuery.error;

  if (feedbackQuery.isPending) {
    return (
      <main className="flex h-full flex-col items-center justify-center bg-background gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">피드백 생성 중...</p>
      </main>
    );
  }

  if (error || !feedback) {
    return (
      <main className="flex h-full items-center justify-center bg-background px-6">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">{error?.message ?? '피드백을 불러올 수 없어요.'}</p>
          <button onClick={() => router.replace('/')} className="text-sm font-medium text-primary">
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  const scoreStyle = comprehensionStyle(feedback.comprehensionScore);

  return (
    <main className="flex h-full flex-col bg-background">
      {/* 상단 결과 헤더 */}
      <div className="px-5 pt-12 pb-5 text-center">
        <p className="mb-1 text-3xl">{feedback.cleared ? '🎉' : '😅'}</p>
        <h1 className="text-xl font-bold text-foreground">
          {feedback.cleared ? '클리어!' : '아쉬워요'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          총 이해도{' '}
          <span className={`text-2xl font-bold ${scoreStyle.color}`}>
            {feedback.comprehensionScore}%
          </span>
        </p>
      </div>

      {/* 스크롤 영역 */}
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 space-y-3">
        {/* 총평 카드 */}
        {feedback.feedbackSummary && (
          <div className="rounded-2xl bg-card border border-border px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">총평</p>
            <p className="text-sm text-foreground leading-relaxed">{feedback.feedbackSummary}</p>
          </div>
        )}

        {/* 발화별 카드 */}
        {feedback.turnFeedbacks.map((turn, i) => (
          <TurnCard key={turn.turnId} turn={turn} index={i} />
        ))}
      </div>

      {/* 하단 나가기 */}
      <div className="border-t border-border bg-card px-4 py-3">
        <button
          onClick={() => router.replace('/')}
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

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 pt-4 pb-3 space-y-3">
        {/* Q */}
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Q{index + 1}. 외국인 질문</p>
          <p className="text-sm text-foreground leading-relaxed">{turn.originalQuestion}</p>
        </div>

        {/* A */}
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">내 답변</p>
          <p className={`text-sm text-foreground leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {turn.userUtterance}
          </p>
          {turn.userUtterance.length > 60 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 py-1 pr-2 text-sm font-medium text-primary"
            >
              {expanded ? '접기' : '더보기'}
            </button>
          )}
        </div>

        {/* 피드백 섹션 — feedbackRequired인 경우에만 */}
        {turn.feedbackRequired && (
          <>
            {/* 외국인 귀에 이렇게 들렸어요 */}
            {turn.nativeLanguageInterpretation && (
              <div className="rounded-xl bg-muted/40 px-3 py-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">외국인 귀에 이렇게 들렸어요</p>
                <p className="text-sm text-foreground leading-relaxed">{turn.nativeLanguageInterpretation}</p>
              </div>
            )}

            {/* 더 나은 표현 */}
            {turn.betterExpression && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3">
                <p className="mb-1.5 text-xs font-bold text-primary">더 나은 표현</p>
                <p className="text-sm font-semibold text-foreground">{turn.betterExpression}</p>
                {turn.nativeUnderstanding && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{turn.nativeUnderstanding}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function comprehensionStyle(score: number) {
  if (score >= 70) return { color: 'text-green-600' };
  if (score >= 40) return { color: 'text-orange-500' };
  return { color: 'text-red-500' };
}
