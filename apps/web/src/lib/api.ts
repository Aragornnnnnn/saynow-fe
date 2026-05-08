// 백엔드 API 호출 함수 및 응답 타입 정의

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? '서버 오류');
  return json.data as T;
}

// --- Category ---

export interface ApiCategory {
  categoryId: string;
  name: string;
}

export function getCategories(): Promise<{ categories: ApiCategory[] }> {
  return request('/api/v1/categories');
}

// --- Scenario ---

export interface ApiScenarioSummary {
  scenarioId: string;
  categoryId: string;
  title: string;
  difficulty: string;
  successGoal: string;
  thumbnailUrl: string | null;
}

export interface ApiScenarioDetail {
  scenarioId: string;
  categoryId: string;
  title: string;
  difficulty: string;
  situationDescription: string;
  successGoal: string;
  openingBabsaeText: string;
  openingTtsUrl: string | null;
  maxFollowUpCount: number;
}

export function getScenarios(categoryId?: string): Promise<{ scenarios: ApiScenarioSummary[] }> {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return request(`/api/v1/scenarios${query}`);
}

export function getScenarioDetail(scenarioId: string): Promise<ApiScenarioDetail> {
  return request(`/api/v1/scenarios/${scenarioId}`);
}

// --- Session ---

export interface ApiSessionStarted {
  sessionId: string;
  scenarioId: string;
  status: string;
  babsaeText: string;
  babsaeTtsUrl: string | null;
  followUpCount: number;
  maxFollowUpCount: number;
  startedAt: string;
}

export interface ApiTurnResult {
  sessionId: string;
  turnId: number;
  turnIndex: number;
  transcript: string;
  sttConfidence: number;
  status: string;
  babsaeText: string;
  babsaeTtsUrl: string | null;
  followUpCount: number;
  maxFollowUpCount: number;
  feedbackAvailable: boolean;
}

export function startSession(scenarioId: string): Promise<ApiSessionStarted> {
  return request('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({ scenarioId }),
  });
}

export function submitTurn(sessionId: string, audioUri: string, speechStartedAfterMs: number): Promise<ApiTurnResult> {
  const formData = new FormData();
  formData.append('audio', { uri: audioUri, name: 'audio.m4a', type: 'audio/m4a' } as unknown as Blob);
  formData.append('request', JSON.stringify({ speechStartedAfterMs }));
  return request(`/api/v1/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: {},
    body: formData,
  });
}

export function recordMicReady(sessionId: string, latencyMs: number): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/micReady`, {
    method: 'PUT',
    body: JSON.stringify({ latencyMs }),
  });
}

export function exitSession(sessionId: string): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/exit`, { method: 'POST' });
}

// --- Feedback ---

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
