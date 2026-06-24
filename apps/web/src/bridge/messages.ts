import type { AuthMember } from '@/store/authStore';
export type BridgeAuthMember = AuthMember;

export type WebToNativeMessage =
  | { type: 'PREPARE_STT'; endpointingMs?: number }
  | { type: 'START_STT'; contextualStrings?: string[]; languageModel?: 'web_search' | 'free_form' }
  | { type: 'STOP_STT' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'PLAY_TTS'; text: string; url: string | null }
  | { type: 'STOP_TTS' }
  | { type: 'NATIVE_LOGIN'; provider: 'KAKAO' | 'GOOGLE' }
  | {
      type: 'AUTH_SESSION_UPDATED';
      accessToken: string;
      refreshToken: string;
      member: BridgeAuthMember;
    }
  | { type: 'AUTH_SESSION_CLEARED' }
  | { type: 'HAPTIC'; style: 'light' | 'medium' | 'heavy' }
  | { type: 'EXIT_APP' };

export type NativeToWebMessage =
  | { type: 'STT_PARTIAL'; transcript: string }
  | { type: 'STT_FINAL'; transcript: string; engine?: 'deepgram' | 'native' }
  | { type: 'STT_ERROR' }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'TTS_END' }
  | { type: 'BACK_PRESSED' }
  | { type: 'NATIVE_LOGIN_SUCCESS'; accessToken: string; refreshToken: string; member: BridgeAuthMember }
  | { type: 'NATIVE_LOGIN_ERROR'; message: string }
  | { type: 'APP_VERSION_INFO'; platform: string; buildNumber: string; versionName?: string };

export function serializeWebMessage(message: WebToNativeMessage): string {
  return JSON.stringify(message);
}

export function parseNativeMessage(raw: unknown): NativeToWebMessage | null {
  if (typeof raw !== 'string') return null;
  if (raw === 'BACK_PRESSED') return { type: 'BACK_PRESSED' };

  try {
    return normalizeNativeMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}

function normalizeNativeMessage(value: unknown): NativeToWebMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  switch (value.type) {
    case 'STT_PARTIAL':
      return typeof value.transcript === 'string'
        ? { type: value.type, transcript: value.transcript }
        : null;
    case 'STT_FINAL':
      return typeof value.transcript === 'string'
        ? {
            type: value.type,
            transcript: value.transcript,
            engine: value.engine === 'deepgram' || value.engine === 'native' ? value.engine : undefined,
          }
        : null;
    case 'STT_ERROR':
    case 'MIC_PERMISSION_DENIED':
    case 'TTS_END':
    case 'BACK_PRESSED':
      return { type: value.type };
    case 'NATIVE_LOGIN_SUCCESS':
      return typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string' &&
        isBridgeAuthMember(value.member)
        ? { type: value.type, accessToken: value.accessToken, refreshToken: value.refreshToken, member: value.member }
        : null;
    case 'NATIVE_LOGIN_ERROR':
      return typeof value.message === 'string'
        ? { type: value.type, message: value.message }
        : null;
    case 'APP_VERSION_INFO':
      return typeof value.platform === 'string' && typeof value.buildNumber === 'string'
        ? { type: value.type, platform: value.platform, buildNumber: value.buildNumber, versionName: typeof value.versionName === 'string' ? value.versionName : undefined }
        : null;
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBridgeAuthMember(value: unknown): value is BridgeAuthMember {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    (typeof value.nickname === 'string' || value.nickname === null) &&
    (typeof value.email === 'string' || value.email === null) &&
    typeof value.provider === 'string' &&
    typeof value.newUser === 'boolean'
  );
}
