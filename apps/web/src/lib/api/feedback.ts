// 세션 완료 및 피드백 생성 API
import { request } from './client';

export interface ApiTurnFeedback {
  turnId: number;
  sequence: number;
  originalQuestion: string;
  translatedQuestion: string;
  userUtterance: string;
  feedbackRequired: boolean;
  nativeUnderstanding: string | null;
  nativeLanguageInterpretation: string | null;
  betterExpression: string | null;
}

export interface ApiFeedback {
  sessionId: number;
  cleared: boolean;
  comprehensionScore: number;
  feedbackSummary: string;
  remainingHearts: number;
  turnFeedbacks: ApiTurnFeedback[];
}

export function createFeedback(sessionId: number): Promise<ApiFeedback> {
  return request(`/api/v1/sessions/${sessionId}/feedback`, {
    method: 'POST',
  });
}
