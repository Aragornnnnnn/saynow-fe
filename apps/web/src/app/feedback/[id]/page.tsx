// 피드백 페이지 — 대화 결과 이해도 및 발화별 말풍선 피드백
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiTurnFeedback } from '@/lib/api';
import { useFeedbackQuery } from '@/queries/feedback';
import { AiBubble } from '@/components/chat/AiBubble';
import { UserBubble } from '@/components/chat/UserBubble';
import { useTts } from '@/hooks/useTts';

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

  return (
    <main className="flex h-full flex-col bg-background">
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain">
        {/* 상단 결과 섹션 */}
        <div className="px-5 pt-12 pb-6 text-center">
          <p className="mb-1 text-4xl">{feedback.cleared ? '🎉' : '😅'}</p>
          <h1 className="text-xl font-bold text-foreground">
            {feedback.cleared ? '클리어!' : '아쉬워요'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            총 이해도{' '}
            <span className={`text-2xl font-bold ${comprehensionStyle(feedback.comprehensionScore)}`}>
              {feedback.comprehensionScore}%
            </span>
          </p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-base ${i < feedback.remainingHearts ? 'opacity-100' : 'opacity-20'}`}>
                ❤️
              </span>
            ))}
          </div>
          {feedback.feedbackSummary && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {feedback.feedbackSummary}
            </p>
          )}
        </div>

        {/* 채팅 피드백 섹션 */}
        <div className="px-4 pb-6 space-y-6">
          <TurnList turns={feedback.turnFeedbacks} />
        </div>
      </div>

      <div className="px-4 pb-10 pt-3 border-t border-border">
        <button
          onClick={() => router.replace('/')}
          className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80 transition-opacity"
        >
          홈으로 가기
        </button>
      </div>
    </main>
  );
}

function TurnList({ turns }: { turns: ApiTurnFeedback[] }) {
  const firstFeedbackIdx = turns.findIndex((t) => t.feedbackRequired);
  return (
    <>
      {turns.map((turn, i) => (
        <TurnBubblePair key={turn.turnId} turn={turn} showHint={i === firstFeedbackIdx} />
      ))}
    </>
  );
}

function TurnBubblePair({ turn, showHint }: { turn: ApiTurnFeedback; showHint: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const isGood = !turn.feedbackRequired;
  const { speak } = useTts();

  function handleUserBubblePress() {
    if (isGood) return;
    setExpanded((v) => !v);
    setHintDismissed(true);
  }

  function handleSpeak() {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }
    speak(turn.originalQuestion, null, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }

  return (
    <div className="space-y-2">
      <AiBubble
        text={turn.originalQuestion}
        translatedText={turn.translatedQuestion}
        showTranslation={showTranslation}
        isSpeaking={isSpeaking}
        onSpeak={handleSpeak}
        onToggleTranslation={() => setShowTranslation((v) => !v)}
      />

      <UserBubble text={turn.userUtterance} onPress={isGood ? undefined : handleUserBubblePress}>
        {isGood && (
          <p className="text-xs font-semibold text-green-600">✓ 잘했어요</p>
        )}
        {!isGood && !hintDismissed && showHint && (
          <p className="text-xs text-muted-foreground">탭해서 피드백 보기</p>
        )}
      </UserBubble>

      {/* 피드백 카드 */}
      {!isGood && expanded && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          {turn.nativeLanguageInterpretation && (
            <div className="mx-1 rounded-2xl bg-zinc-100 px-5 py-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground tracking-wide">🎧 외국인 귀에는 이렇게 들렸어요</p>
              <p className="text-lg font-bold text-foreground leading-snug">&ldquo;{turn.nativeLanguageInterpretation}&rdquo;</p>
            </div>
          )}
          {turn.betterExpression && (
            <div className="mx-1 rounded-2xl bg-green-50 border border-green-200 px-5 py-4">
              <p className="mb-2 text-xs font-semibold text-green-600 tracking-wide">✨ 이렇게 말했다면</p>
              <p className="text-xl font-bold text-green-700 leading-snug">{turn.betterExpression}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function comprehensionStyle(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}
