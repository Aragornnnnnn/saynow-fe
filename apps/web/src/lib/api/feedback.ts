// 세션 완료 및 피드백 생성 API
import { request } from './client';

export interface ApiTurnFeedback {
  turnId: number;
  sequence: number;
  originalQuestion: string;
  translatedQuestion: string;
  userUtterance: string;
  feedbackType: 'GOOD' | 'NEEDS_IMPROVEMENT';
  koreanAnalogy: string | null;
  positiveFeedback: string | null;
  feedbackDetail: string | null;
  correctionExpression: string | null;
  correctionReason: string | null;
  benchmarkMessage: string | null;
}

export interface ApiFeedback {
  sessionId: number;
  nativeScore: number;
  highlightMessage: string;
  turnFeedbacks: ApiTurnFeedback[];
}

export function createFeedback(sessionId: number): Promise<ApiFeedback> {
  return request(`/api/v1/sessions/${sessionId}/feedback`, {
    method: 'POST',
  });
}

export function submitNps(sessionId: number, score: number, comment?: string): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/nps`, {
    method: 'POST',
    body: JSON.stringify({
      score,
      lowScoreReason: comment?.trim() ? comment : null,
    }),
  });
}
