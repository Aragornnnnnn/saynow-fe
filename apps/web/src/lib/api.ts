// 백엔드 API 호출 함수 및 응답 타입 정의

// zustand store를 직접 import하면 SSR 문제가 생기므로 런타임에 동적으로 접근
function getAuthStore() {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/store/authStore').useAuthStore.getState();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = getAuthStore();
  const accessToken = auth?.accessToken ?? null;

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(path, { ...init, headers });

  // 401이면 refresh 1회 시도
  if (res.status === 401 && auth?.refreshToken) {
    const refreshed = await tryRefresh(auth.refreshToken);
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${refreshed}` };
      const retry = await fetch(path, { ...init, headers: retryHeaders });
      const retryJson = await retry.json();
      if (!retryJson.success) throw new Error(retryJson.error?.message ?? '서버 오류');
      return retryJson.data as T;
    } else {
      auth.clearAuth();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('세션이 만료됐습니다. 다시 로그인해 주세요.');
    }
  }

  const json = await res.json();
  if (!json.success) {
    if (process.env.NODE_ENV === 'development') console.error('[API] error response:', json);
    throw new Error(json.error?.message ?? '서버 오류');
  }
  return json.data as T;
}

// refresh 성공 시 새 access token 반환, 실패 시 null
async function tryRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/auth/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (!json.success) return null;
    const auth = getAuthStore();
    auth?.setAuth(json.data.accessToken, json.data.refreshToken, auth.member);
    return json.data.accessToken as string;
  } catch {
    return null;
  }
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

export function getScenarios(): Promise<{ scenarios: ApiScenarioSummary[] }> {
  return request('/api/v1/scenarios');
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

export function submitTurn(
  sessionId: string,
  audioBase64: string,
  speechStartedAfterMs: number,
  mimeType = 'audio/x-m4a',
): Promise<ApiTurnResult> {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const audioBlob = new Blob([bytes], { type: mimeType });
  const ext = mimeType.includes('webm') ? 'webm' : 'm4a';

  const formData = new FormData();
  formData.append('audio', audioBlob, `audio.${ext}`);
  const requestBlob = new Blob([JSON.stringify({ inputType: 'AUDIO', speechStartedAfterMs })], { type: 'application/json' });
  formData.append('request', requestBlob, 'request.json');
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

// --- Auth ---

export type SocialProvider = 'GOOGLE' | 'KAKAO';

export interface SocialLoginResponse {
  accessToken: string;
  refreshToken: string;
  member: {
    memberId: string;
    nickname: string | null;
    email: string | null;
    provider: string;
    newMember: boolean;
  };
}

export function socialLogin(
  provider: SocialProvider,
  idToken: string,
  nonce: string
): Promise<SocialLoginResponse> {
  return request('/api/v1/auth/social-login', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken, nonce }),
  });
}
