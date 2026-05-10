import type { AuthMember } from '@/store/authStore';

type AuthStoreState = {
  accessToken: string | null;
  refreshToken: string | null;
  member: AuthMember | null;
  setAuth: (accessToken: string, refreshToken: string, member: AuthMember) => void;
  clearAuth: () => void;
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: { code?: string; message?: string } };

function getAuthStore(): AuthStoreState | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/store/authStore').useAuthStore.getState();
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = getAuthStore();
  const accessToken = auth?.accessToken ?? null;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };

  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(path, { ...init, headers });

  if (response.status === 401 && auth?.refreshToken) {
    const refreshed = await tryRefresh(auth);
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${refreshed}` };
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
  const json = (await response.json()) as ApiEnvelope<T>;

  if (!json.success) {
    if (process.env.NODE_ENV === 'development') console.error('[API] error response:', json);
    const err = new Error(json.error?.message ?? '서버 오류') as Error & { code?: string };
    err.code = json.error?.code;
    throw err;
  }

  return json.data;
}

async function tryRefresh(auth: AuthStoreState): Promise<string | null> {
  if (!auth.member) return null;

  try {
    const response = await fetch('/api/v1/auth/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    const json = (await response.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
    if (!json.success) return null;

    auth.setAuth(json.data.accessToken, json.data.refreshToken, auth.member);
    return json.data.accessToken;
  } catch {
    return null;
  }
}
