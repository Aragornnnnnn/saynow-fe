export type BridgeSocialProvider = 'GOOGLE' | 'KAKAO';

export type WebToNativeMessage =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'REQUEST_MIC_PERMISSION' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'PLAY_TTS'; text: string; url: string | null }
  | { type: 'REQUEST_SOCIAL_LOGIN'; provider: BridgeSocialProvider; nonce: string };

export type NativeToWebMessage =
  | { type: 'RECORDING_DONE'; base64: string; mimeType?: string }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'MIC_PERMISSION_STATUS'; granted: boolean }
  | { type: 'SOCIAL_LOGIN_RESULT'; provider: BridgeSocialProvider; idToken: string }
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
    case 'SOCIAL_LOGIN_RESULT':
      return isBridgeProvider(value.provider) && typeof value.idToken === 'string'
        ? { type: value.type, provider: value.provider, idToken: value.idToken }
        : null;
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

function isBridgeProvider(value: unknown): value is BridgeSocialProvider {
  return value === 'GOOGLE' || value === 'KAKAO';
}
