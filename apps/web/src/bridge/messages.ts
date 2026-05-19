export type BridgeAuthMember = {
  memberId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newMember: boolean;
};

export type WebToNativeMessage =
  | { type: 'START_STT' }
  | { type: 'STOP_STT' }
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
  | { type: 'STT_PARTIAL'; transcript: string }
  | { type: 'STT_FINAL'; transcript: string }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'TTS_END' }
  | { type: 'BACK_PRESSED' };

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
      return { type: value.type };
    case 'BACK_PRESSED':
      return { type: value.type };
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
