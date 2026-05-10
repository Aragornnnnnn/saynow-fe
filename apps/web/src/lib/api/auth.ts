import { request } from './client';

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
  nonce: string,
): Promise<SocialLoginResponse> {
  return request('/api/v1/auth/social-login', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken, nonce }),
  });
}
