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
  | { type: 'STT_ERROR' }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'TTS_END' }
  | { type: 'BACK_PRESSED' }
  | { type: 'NATIVE_LOGIN_SUCCESS'; accessToken: string; refreshToken: string; member: BridgeAuthMember }
  | { type: 'NATIVE_LOGIN_ERROR'; message: string };

export function serializeNativeMessage(message: NativeToWebMessage): string {
  return JSON.stringify(message);
}

export function parseWebMessage(raw: unknown): WebToNativeMessage | null {
  if (typeof raw !== 'string') return null;

  try {
    return normalizeWebMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}

function normalizeWebMessage(value: unknown): WebToNativeMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  switch (value.type) {
    case 'START_STT':
    case 'STOP_STT':
    case 'OPEN_SETTINGS':
      return { type: value.type };
    case 'PLAY_TTS':
      return typeof value.text === 'string'
        ? { type: value.type, text: value.text, url: optionalString(value.url) ?? null }
        : null;
    case 'AUTH_SESSION_UPDATED':
      return typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string' &&
        isBridgeAuthMember(value.member)
        ? {
            type: value.type,
            accessToken: value.accessToken,
            refreshToken: value.refreshToken,
            member: value.member,
          }
        : null;
    case 'NATIVE_LOGIN':
      return value.provider === 'KAKAO' || value.provider === 'GOOGLE'
        ? { type: value.type, provider: value.provider }
        : null;
    case 'AUTH_SESSION_CLEARED':
      return { type: value.type };
    case 'HAPTIC':
      return value.style === 'light' || value.style === 'medium' || value.style === 'heavy'
        ? { type: value.type, style: value.style }
        : null;
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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
