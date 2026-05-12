import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login as kakaoLogin } from '@react-native-kakao/user';
import { Platform } from 'react-native';
import type { SocialProvider } from './mobileApi';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_SCHEME = 'saynow';
const REDIRECT_PATH = 'oauthredirect';

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const GOOGLE_SCOPES = ['openid', 'email', 'profile'];
const KAKAO_ADDITIONAL_SCOPES = ['profile_nickname'];
let kakaoInitializePromise: Promise<void> | null = null;

export class SocialLoginError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function requestSocialIdToken(
  provider: SocialProvider,
  nonce: string,
): Promise<string> {
  switch (provider) {
    case 'GOOGLE':
      return requestGoogleIdToken(nonce);
    case 'KAKAO':
      return requestKakaoIdToken(nonce);
  }
}

function getRedirectUri() {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  return AuthSession.makeRedirectUri({
    scheme: REDIRECT_SCHEME,
    path: REDIRECT_PATH,
  });
}

function getGoogleClientId() {
  const platformClientId = Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  const clientId = firstNonEmpty(
    platformClientId,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  );

  if (!clientId) {
    throw new SocialLoginError(
      'GOOGLE_CLIENT_ID_MISSING',
      'Google OAuth client ID가 설정되지 않았습니다.',
    );
  }

  return clientId;
}

async function requestGoogleIdToken(nonce: string): Promise<string> {
  const clientId = getGoogleClientId();
  const redirectUri = getRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: GOOGLE_SCOPES,
    prompt: AuthSession.Prompt.SelectAccount,
    extraParams: { nonce },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  const code = assertAuthCode(result, 'GOOGLE_LOGIN_CANCELLED');
  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    },
    GOOGLE_DISCOVERY,
  );

  return assertIdToken(token.idToken, 'GOOGLE_ID_TOKEN_MISSING');
}

async function requestKakaoIdToken(nonce: string): Promise<string> {
  await ensureKakaoSdkInitialized();
  const redirectUri = getRedirectUri();
  const baseToken = await kakaoLogin({
    useKakaoAccountLogin: true,
    web: {
      redirectUri,
      nonce,
    },
  });

  const missingScopes = KAKAO_ADDITIONAL_SCOPES.filter(
    (scope) => !baseToken.scopes.includes(scope),
  );
  if (missingScopes.length === 0) {
    return assertIdToken(baseToken.idToken, 'KAKAO_ID_TOKEN_MISSING');
  }

  try {
    const scopedToken = await kakaoLogin({
      useKakaoAccountLogin: true,
      scopes: missingScopes,
      web: {
        redirectUri,
        nonce,
      },
    });

    return assertIdToken(scopedToken.idToken ?? baseToken.idToken, 'KAKAO_ID_TOKEN_MISSING');
  } catch (error) {
    console.warn('[Kakao] Failed to request optional scopes:', error);
    return assertIdToken(baseToken.idToken, 'KAKAO_ID_TOKEN_MISSING');
  }
}

function assertAuthCode(result: AuthSession.AuthSessionResult, cancelCode: string) {
  if (result.type !== 'success') {
    throw new SocialLoginError(cancelCode, '소셜 로그인이 취소되었습니다.');
  }

  const error = result.params.error;
  if (error) {
    throw new SocialLoginError(
      String(error),
      String(result.params.error_description ?? error),
    );
  }

  const code = result.params.code;
  if (!code) {
    throw new SocialLoginError('AUTH_CODE_MISSING', '소셜 로그인 인증 코드를 받지 못했습니다.');
  }

  return code;
}

function assertIdToken(idToken: string | undefined, code: string) {
  if (!idToken) {
    throw new SocialLoginError(code, '소셜 로그인 ID token을 받지 못했습니다.');
  }

  return idToken;
}

async function ensureKakaoSdkInitialized() {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();
  if (!nativeAppKey) {
    throw new SocialLoginError(
      'KAKAO_NATIVE_APP_KEY_MISSING',
      'Kakao Native App Key가 설정되지 않았습니다.',
    );
  }

  kakaoInitializePromise ??= initializeKakaoSDK(nativeAppKey);

  return kakaoInitializePromise;
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}
