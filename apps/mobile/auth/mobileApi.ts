export type SocialProvider = 'GOOGLE' | 'KAKAO';

export interface AuthMember {
  userId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newUser: boolean;
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
  user: {
    userId: string;
    nickname: string | null;
    email: string | null;
    provider: string;
    newUser: boolean;
  };
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
  if (__DEV__) console.log('[AuthDebug][API] social-login start', {
    provider,
    idToken: describeToken(idToken),
    nonceLength: nonce.length,
  });
  const raw = await request<SocialLoginResponse>('/api/v1/auth/social-login', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken, nonce }),
  });
  const session: NativeAuthSession = {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    member: {
      userId: raw.user.userId,
      nickname: raw.user.nickname,
      email: raw.user.email,
      provider: raw.user.provider,
      newUser: raw.user.newUser,
    },
  };
  if (__DEV__) console.log('[AuthDebug][API] social-login success', {
    provider: session.member.provider,
    userId: session.member.userId,
    newUser: session.member.newUser,
    accessTokenLength: session.accessToken.length,
    refreshTokenLength: session.refreshToken.length,
  });

  return session;
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

  const url = new URL(path, API_BASE_URL).toString();
  if (__DEV__) console.log('[AuthDebug][API] request start', {
    method: init.method ?? 'GET',
    path,
    baseUrl: API_BASE_URL,
  });

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const text = await response.text();
  if (__DEV__) console.log('[AuthDebug][API] response received', {
    path,
    status: response.status,
    ok: response.ok,
    bodyLength: text.length,
  });

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
    if (__DEV__) console.warn('[AuthDebug][API] response error', {
      path,
      status: response.status,
      code: json.error?.code,
      message: json.error?.message,
    });
    throw new Error(json.error?.message ?? '서버 오류가 발생했습니다.');
  }

  return json.data;
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}

function describeToken(token: string) {
  const parts = token.split('.');
  return {
    length: token.length,
    jwtParts: parts.length,
    headerLength: parts[0]?.length ?? 0,
    payloadLength: parts[1]?.length ?? 0,
  };
}
