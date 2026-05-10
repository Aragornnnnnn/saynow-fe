import type { BridgeSocialProvider } from './messages';
import { webBridge } from './webBridge';

export function startNativeRecording() {
  return webBridge.send({ type: 'START_RECORDING' });
}

export function stopNativeRecording() {
  return webBridge.send({ type: 'STOP_RECORDING' });
}

export function requestNativeMicPermission() {
  return webBridge.send({ type: 'REQUEST_MIC_PERMISSION' });
}

export function openNativeSettings() {
  return webBridge.send({ type: 'OPEN_SETTINGS' });
}

export function playNativeTts(text: string, url: string | null) {
  return webBridge.send({ type: 'PLAY_TTS', text, url });
}

export function requestNativeSocialLogin(provider: BridgeSocialProvider, nonce: string) {
  return webBridge.send({ type: 'REQUEST_SOCIAL_LOGIN', provider, nonce });
}
