import { request } from './client';
import type { AuthMember } from '@/store/authStore';

export type SocialProvider = 'GOOGLE' | 'KAKAO';

export interface AuthTokenResponse {
  tokenType: string;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}

export interface SocialLoginResponse extends AuthTokenResponse {
  user: AuthMember;
}

export function socialLogin(
  provider: SocialProvider,
  idToken: string,
  nonce: string,
): Promise<SocialLoginResponse> {
  return request('/api/v1/auth/social-login', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken, nonce }),
  });
}

export function refreshToken(refreshTokenValue: string): Promise<AuthTokenResponse> {
  return request('/api/v1/auth/token/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });
}

export async function logout(refreshTokenValue: string): Promise<void> {
  await request<null>('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });
}
