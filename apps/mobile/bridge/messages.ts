export type BridgeAuthMember = {
  memberId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newMember: boolean;
};

export type WebToNativeMessage =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'REQUEST_MIC_PERMISSION' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'PLAY_TTS'; text: string; url: string | null }
  | {
      type: 'AUTH_SESSION_UPDATED';
      accessToken: string;
      refreshToken: string;
      member: BridgeAuthMember;
    }
  | { type: 'AUTH_SESSION_CLEARED' };

export type NativeToWebMessage =
  | { type: 'RECORDING_DONE'; base64: string; mimeType?: string }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'MIC_PERMISSION_STATUS'; granted: boolean }
  | { type: 'BACK_PRESSED' };

export function serializeNativeMessage(message: NativeToWebMessage): string {
  return JSON.stringify(message);
}

export function parseWebMessage(raw: unknown): WebToNativeMessage | null {
  if (typeof raw !== 'string') return null;
  const legacyMessage = parseLegacyWebMessage(raw);
  if (legacyMessage) return legacyMessage;

  try {
    return normalizeWebMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseLegacyWebMessage(raw: string): WebToNativeMessage | null {
  switch (raw) {
    case 'START_RECORDING':
    case 'STOP_RECORDING':
    case 'REQUEST_MIC_PERMISSION':
    case 'OPEN_SETTINGS':
      return { type: raw };
    default:
      return null;
  }
}

function normalizeWebMessage(value: unknown): WebToNativeMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  switch (value.type) {
    case 'START_RECORDING':
    case 'STOP_RECORDING':
    case 'REQUEST_MIC_PERMISSION':
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
    case 'AUTH_SESSION_CLEARED':
      return { type: value.type };
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
    typeof value.memberId === 'string' &&
    (typeof value.nickname === 'string' || value.nickname === null) &&
    (typeof value.email === 'string' || value.email === null) &&
    typeof value.provider === 'string' &&
    typeof value.newMember === 'boolean'
  );
}
