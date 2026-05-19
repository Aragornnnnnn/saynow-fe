import type { BridgeAuthMember } from './messages';
import { webBridge } from './webBridge';

export function openNativeSettings() {
  return webBridge.send({ type: 'OPEN_SETTINGS' });
}

export function startNativeStt() {
  return webBridge.send({ type: 'START_STT' });
}

export function stopNativeStt() {
  return webBridge.send({ type: 'STOP_STT' });
}

export function playNativeTts(text: string, url: string | null) {
  return webBridge.send({ type: 'PLAY_TTS', text, url });
}

export function updateNativeAuthSession(
  accessToken: string,
  refreshToken: string,
  member: BridgeAuthMember,
) {
  return webBridge.send({ type: 'AUTH_SESSION_UPDATED', accessToken, refreshToken, member });
}

export function clearNativeAuthSession() {
  return webBridge.send({ type: 'AUTH_SESSION_CLEARED' });
}
