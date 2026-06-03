// 세션 피드백 조회 API
import { request } from './client';

export interface ApiTurnFeedback {
  turnId: number;
  sequence: number;
  originalQuestion: string;
  translatedQuestion: string;
  userUtterance: string;
  feedbackType: string;
  koreanAnalogy: string | null;
  feedbackDetail: string | null;
  betterExpression: string | null;
}

export interface ApiFeedback {
  sessionId: number;
  nativeScore: number;
  summary: string;
  turnFeedbacks: ApiTurnFeedback[];
}

export function getFeedback(sessionId: number): Promise<ApiFeedback> {
  return request(`/api/v1/sessions/${sessionId}/feedback`, {
    method: 'GET',
  });
}

export function submitNps(sessionId: number, score: number, lowScoreReason?: string): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/nps`, {
    method: 'POST',
    body: JSON.stringify({
      score,
      lowScoreReason: score <= 2 ? (lowScoreReason ?? null) : null,
    }),
  });
}
