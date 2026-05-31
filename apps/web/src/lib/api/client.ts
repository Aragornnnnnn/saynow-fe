import type { AuthMember } from '@/store/authStore';
import { updateNativeAuthSession } from '@/bridge/commands';

type AuthStoreState = {
  accessToken: string | null;
  refreshToken: string | null;
  member: AuthMember | null;
  setAuth: (accessToken: string, refreshToken: string, member: AuthMember) => void;
  clearAuth: () => void;
};

type ApiEnvelope<T> =
  | { success: true; data: T; error?: null }
  | { success: false; data?: null; error?: { code?: string; message?: string } };

type RefreshTokenResponse = {
  tokenType: string;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

const REFRESH_PATH = '/api/v1/auth/token/refresh';
let refreshPromise: Promise<string | null> | null = null;

function getAuthStore(): AuthStoreState | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/store/authStore').useAuthStore.getState();
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = getAuthStore();
  const accessToken = auth?.accessToken ?? null;
  const headers = new Headers(init?.headers);

  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(path, { ...init, headers });

  if (response.status === 401 && auth?.refreshToken && path !== REFRESH_PATH) {
    const refreshed = await refreshAccessToken(auth);
    if (refreshed) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', `Bearer ${refreshed}`);
      const retry = await fetch(path, { ...init, headers: retryHeaders });
      return readEnvelope<T>(retry);
    }

    auth.clearAuth();
    window.location.href = '/login';
    throw new Error('세션이 만료됐습니다. 다시 로그인해 주세요.');
  }

  return readEnvelope<T>(response);
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    if (response.ok) return undefined as T;
    throw new Error(`요청에 실패했습니다. (${response.status})`);
  }

  let json: ApiEnvelope<T>;
  try {
    json = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(`서버 응답을 읽지 못했습니다. (${response.status})`);
  }

  if (!json.success) {
    if (process.env.NODE_ENV === 'development') console.error('[API] error response:', json);
    const err = new Error(json.error?.message ?? '서버 오류') as Error & { code?: string };
    err.code = json.error?.code;
    throw err;
  }

  return json.data;
}

function refreshAccessToken(auth: AuthStoreState): Promise<string | null> {
  refreshPromise ??= tryRefresh(auth).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function ensureAccessToken(): Promise<string | null> {
  const auth = getAuthStore();
  if (!auth) return null;
  if (auth.accessToken) return auth.accessToken;
  if (!auth.refreshToken) return null;
  return tryRefresh(auth);
}

async function tryRefresh(auth: AuthStoreState): Promise<string | null> {
  if (!auth.member) return null;

  try {
    const response = await fetch(REFRESH_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    const data = await readEnvelope<RefreshTokenResponse>(response);

    auth.setAuth(data.accessToken, data.refreshToken, auth.member);
    updateNativeAuthSession(data.accessToken, data.refreshToken, auth.member);
    return data.accessToken;
  } catch {
    return null;
  }
}
