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
    };

export type NativeToWebMessage =
  | { type: 'RECORDING_DONE'; base64: string; mimeType?: string }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'MIC_PERMISSION_STATUS'; granted: boolean }
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
    case 'RECORDING_DONE':
      return typeof value.base64 === 'string'
        ? { type: value.type, base64: value.base64, mimeType: optionalString(value.mimeType) }
        : null;
    case 'MIC_PERMISSION_DENIED':
      return { type: value.type };
    case 'MIC_PERMISSION_STATUS':
      return typeof value.granted === 'boolean' ? { type: value.type, granted: value.granted } : null;
    case 'BACK_PRESSED':
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
