export type BridgeAuthMember = {
  userId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newUser: boolean;
};

export type WebToNativeMessage =
  | { type: 'START_STT' }
  | { type: 'STOP_STT' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'PLAY_TTS'; text: string; url: string | null }
  | { type: 'NATIVE_LOGIN'; provider: 'KAKAO' | 'GOOGLE' }
  | {
      type: 'AUTH_SESSION_UPDATED';
      accessToken: string;
      refreshToken: string;
      member: BridgeAuthMember;
    }
  | { type: 'AUTH_SESSION_CLEARED' }
  | { type: 'HAPTIC'; style: 'light' | 'medium' | 'heavy' };

export type NativeToWebMessage =
  | { type: 'STT_PARTIAL'; transcript: string }
  | { type: 'STT_FINAL'; transcript: string }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'TTS_END' }
  | { type: 'BACK_PRESSED' }
  | { type: 'NATIVE_LOGIN_SUCCESS'; accessToken: string; refreshToken: string; member: BridgeAuthMember }
  | { type: 'NATIVE_LOGIN_ERROR'; message: string };

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
    case 'STT_FINAL':
      return typeof value.transcript === 'string'
        ? { type: value.type, transcript: value.transcript }
        : null;
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
