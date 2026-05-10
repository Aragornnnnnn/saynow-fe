import { request } from './client';

export interface ApiTurnFeedback {
  turnId: number;
  turnIndex: number;
  questionText: string;
  userTranscript: string;
  speechStartedAfterMs: number;
  speechStartedAfterSeconds: number;
  understoodScore: number;
  heardAs: string;
  betterExpression: string;
  scoreDelta: number;
  improvedUnderstoodScore: number;
  reason: string;
}

export interface ApiFeedback {
  sessionId: string;
  scenarioResult: 'SUCCESS' | 'FAILURE';
  totalUnderstoodScore: number;
  summary: string;
  turnFeedback: ApiTurnFeedback[];
}

export function getSessionFeedback(sessionId: string): Promise<ApiFeedback> {
  return request(`/api/v1/sessions/${sessionId}/feedback`);
}
