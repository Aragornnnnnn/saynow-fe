import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login as kakaoLogin } from '@react-native-kakao/user';
import { Platform } from 'react-native';
import type { SocialProvider } from './mobileApi';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_SCHEME = 'landit';
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
    case 'APPLE':
      return requestAppleIdToken(nonce);
  }
}

// Apple 네이티브 로그인 — OS가 시트를 띄우고 id_token을 발급하므로 별도 클라이언트 설정이 없다.
// nonce는 요청에 넣은 값이 그대로 id_token의 nonce 클레임에 들어간다 (Google/Kakao와 동일하게 raw 전달).
async function requestAppleIdToken(nonce: string): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new SocialLoginError('APPLE_LOGIN_UNSUPPORTED', 'Apple 로그인은 iOS에서만 쓸 수 있습니다.');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
    return assertIdToken(credential.identityToken ?? undefined, 'APPLE_ID_TOKEN_MISSING');
  } catch (error) {
    if (isRequestCanceled(error)) {
      throw new SocialLoginError('APPLE_LOGIN_CANCELLED', '소셜 로그인이 취소되었습니다.');
    }
    throw error;
  }
}

function isRequestCanceled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
  );
}

function getRedirectUri() {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  return AuthSession.makeRedirectUri({
    scheme: REDIRECT_SCHEME,
    path: REDIRECT_PATH,
  });
}

// "xxx.apps.googleusercontent.com" → "com.googleusercontent.apps.xxx" (iOS redirect 스킴)
function reversedClientId(clientId: string): string {
  const withoutSuffix = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${withoutSuffix}`;
}

// iOS Google OAuth는 reversed client ID 스킴만 redirect로 허용한다(커스텀 스킴/웹 URL 불가).
// Android는 기존 landit 커스텀 스킴을 그대로 쓴다.
function getGoogleRedirectUri(clientId: string): string {
  if (Platform.OS === 'ios') {
    return AuthSession.makeRedirectUri({
      scheme: reversedClientId(clientId),
      path: REDIRECT_PATH,
    });
  }
  return getRedirectUri();
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
  const redirectUri = getGoogleRedirectUri(clientId);
  if (__DEV__) console.log('[AuthDebug][Google] OAuth start', {
    clientId: maskClientId(clientId),
    redirectUri,
    nonceLength: nonce.length,
  });
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: GOOGLE_SCOPES,
    prompt: AuthSession.Prompt.SelectAccount,
    extraParams: { nonce },
  });

  const authUrl = await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  if (__DEV__) console.log('[AuthDebug][Google] OAuth auth URL ready', {
    urlPrefix: authUrl.split('?')[0],
    paramKeys: getUrlParamKeys(authUrl),
    hasCodeChallenge: authUrl.includes('code_challenge='),
    hasState: authUrl.includes('state='),
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY, { url: authUrl });
  if (__DEV__) console.log('[AuthDebug][Google] OAuth prompt result', {
    type: result.type,
    urlPrefix: 'url' in result ? result.url.split('?')[0] : undefined,
    paramKeys: 'params' in result ? Object.keys(result.params) : undefined,
  });
  const code = assertAuthCode(result, 'GOOGLE_LOGIN_CANCELLED');
  if (__DEV__) console.log('[AuthDebug][Google] Auth code received', {
    codeLength: code.length,
    hasCodeVerifier: !!request.codeVerifier,
    codeVerifierLength: request.codeVerifier?.length ?? 0,
  });
  if (__DEV__) console.log('[AuthDebug][Google] Exchanging code for token');
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
  if (__DEV__) console.log('[AuthDebug][Google] Token exchange complete', describeToken(token.idToken));

  return assertIdToken(token.idToken, 'GOOGLE_ID_TOKEN_MISSING');
}

async function requestKakaoIdToken(nonce: string): Promise<string> {
  await ensureKakaoSdkInitialized();
  const redirectUri = getRedirectUri();
  const baseToken = await kakaoLogin({
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

function maskClientId(clientId: string) {
  const [prefix, domain] = clientId.split('.');
  return `${prefix.slice(0, 12)}...${domain ?? ''}`;
}

function getUrlParamKeys(url: string) {
  try {
    return Array.from(new URL(url).searchParams.keys());
  } catch {
    const query = url.split('?')[1];
    return query ? Array.from(new URLSearchParams(query).keys()) : [];
  }
}

function describeToken(token: string | undefined) {
  const parts = token?.split('.') ?? [];
  return {
    present: !!token,
    length: token?.length ?? 0,
    jwtParts: parts.length,
    headerLength: parts[0]?.length ?? 0,
    payloadLength: parts[1]?.length ?? 0,
  };
}
