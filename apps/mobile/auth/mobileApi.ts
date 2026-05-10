export type SocialProvider = 'GOOGLE' | 'KAKAO';

export interface AuthMember {
  memberId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newMember: boolean;
}

export interface NativeAuthSession {
  accessToken: string;
  refreshToken: string;
  member: AuthMember;
}

type ApiEnvelope<T> =
  | { success: true; data: T; error?: null }
  | { success: false; data?: null; error?: { code?: string; message?: string } };

type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
};

type SocialLoginResponse = AuthTokenResponse & {
  member: AuthMember;
};

const API_BASE_URL = firstNonEmpty(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  process.env.EXPO_PUBLIC_WEB_URL,
);

export async function socialLogin(
  provider: SocialProvider,
  idToken: string,
  nonce: string,
): Promise<NativeAuthSession> {
  return request<SocialLoginResponse>('/api/v1/auth/social-login', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken, nonce }),
  });
}

export async function refreshAuthSession(
  refreshToken: string,
  member: AuthMember,
): Promise<NativeAuthSession> {
  const tokens = await request<AuthTokenResponse>('/api/v1/auth/token/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    member,
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('앱 API 서버 주소가 설정되지 않았습니다.');
  }

  const response = await fetch(new URL(path, API_BASE_URL).toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
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
    throw new Error(json.error?.message ?? '서버 오류가 발생했습니다.');
  }

  return json.data;
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}
