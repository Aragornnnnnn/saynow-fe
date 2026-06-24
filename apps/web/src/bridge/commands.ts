import type { BridgeAuthMember } from './messages';
import { webBridge } from './webBridge';

export function openNativeSettings() {
  return webBridge.send({ type: 'OPEN_SETTINGS' });
}

export function requestNativeLogin(provider: 'KAKAO' | 'GOOGLE') {
  return webBridge.send({ type: 'NATIVE_LOGIN', provider });
}

// 침묵 감지 시간(ms) — 이만큼 멈추면 발화 종료로 판단. 학습자 호흡을 고려해 2초.
// 여기 값만 바꿔 웹 배포하면 앱 재빌드 없이 조정됨(네이티브는 못 받으면 자체 기본값 사용)
export const STT_ENDPOINTING_MS = 2000;

export function prepareNativeStt(endpointingMs: number = STT_ENDPOINTING_MS) {
  return webBridge.send({ type: 'PREPARE_STT', endpointingMs });
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

export function stopNativeTts() {
  return webBridge.send({ type: 'STOP_TTS' });
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

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  return webBridge.send({ type: 'HAPTIC', style });
}

export function exitApp() {
  return webBridge.send({ type: 'EXIT_APP' });
}
