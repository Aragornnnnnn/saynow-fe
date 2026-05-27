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

let _pendingSession: Promise<ApiSessionStarted> | null = null;
let _pendingScenarioId: number | null = null;

export function prefetchSession(scenarioId: number) {
  _pendingScenarioId = scenarioId;
  _pendingSession = request(`/api/v1/scenarios/${scenarioId}/sessions`, { method: 'POST' });
}

export function startSession(scenarioId: number): Promise<ApiSessionStarted> {
  if (_pendingSession && _pendingScenarioId === scenarioId) {
    const cached = _pendingSession;
    _pendingSession = null;
    _pendingScenarioId = null;
    return cached;
  }
  return request(`/api/v1/scenarios/${scenarioId}/sessions`, { method: 'POST' });
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

export interface ApiGuideResult {
  sessionId: number;
  answer: string;
}

export function askGuide(
  sessionId: number,
  question: string,
): Promise<ApiGuideResult> {
  return request(`/api/v1/sessions/${sessionId}/guide`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export function exitSession(sessionId: number): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' });
}
