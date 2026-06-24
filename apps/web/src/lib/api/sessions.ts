// 대화 세션 시작/응답 제출/종료 API
import { request } from './client';

export interface ApiSessionTurn {
  turnId: number;
  sequence: number;
  aiQuestion: string;
  translatedQuestion: string;
}

export interface ApiSessionProgress {
  currentSequence: number;
  totalQuestionCount: number;
  completed: boolean;
}

export interface ApiSessionStarted {
  sessionId: number;
  scenarioId: number;
  totalQuestionCount: number;
  currentTurn: ApiSessionTurn;
  progress: ApiSessionProgress;
}

export type InnerThoughtType = 'GOOD' | 'NORMAL' | 'BAD';

export interface ApiSubmittedTurn {
  turnId: number;
  sequence: number;
  turnFeedbackStatus: string;
  innerThought: string | null;
  innerThoughtType: InnerThoughtType | null;
}

export interface ApiUtteranceResult {
  submittedTurn: ApiSubmittedTurn;
  nextTurn: ApiSessionTurn | null;
  progress: ApiSessionProgress;
}

let _pendingSession: Promise<ApiSessionStarted> | null = null;
let _pendingScenarioId: number | null = null;
let _pendingFailed = false;

export function prefetchSession(scenarioId: number) {
  _pendingScenarioId = scenarioId;
  _pendingFailed = false;
  _pendingSession = request<ApiSessionStarted>(`/api/v1/scenarios/${scenarioId}/sessions`, { method: 'POST' });
  _pendingSession.catch(() => { _pendingFailed = true; });
}

export function startSession(scenarioId: number): Promise<ApiSessionStarted> {
  if (_pendingSession && _pendingScenarioId === scenarioId && !_pendingFailed) {
    const cached = _pendingSession;
    _pendingSession = null;
    _pendingScenarioId = null;
    _pendingFailed = false;
    return cached;
  }
  _pendingSession = null;
  _pendingScenarioId = null;
  _pendingFailed = false;
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

export function abandonSession(sessionId: number): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/abandon`, { method: 'PATCH' });
}
