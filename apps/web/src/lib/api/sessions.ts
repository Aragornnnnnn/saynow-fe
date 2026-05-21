// 대화 세션 시작/응답 제출/종료 API
import { request } from './client';

export interface ApiSessionStarted {
  sessionId: number;
  originalQuestion: string;
  translatedQuestion: string;
  remainingHearts: number;
  feedbackAvailable: boolean;
}

export interface ApiUtteranceResult {
  sessionId: number;
  originalQuestion: string;
  translatedQuestion: string;
  remainingHearts: number;
  feedbackAvailable: boolean;
}

export function startSession(scenarioId: number): Promise<ApiSessionStarted> {
  return request(`/api/v1/scenarios/${scenarioId}/sessions`, {
    method: 'POST',
  });
}

export function submitUtterance(
  sessionId: number,
  userUtterance: string,
): Promise<ApiUtteranceResult> {
  return request(`/api/v1/sessions/${sessionId}/utterances`, {
    method: 'POST',
    body: JSON.stringify({ userUtterance }),
  });
}

export function exitSession(sessionId: number): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' });
}
