// Amplitude track / identify 헬퍼 — 전체 앱에서 이 모듈만 import해서 사용
import * as amplitude from '@amplitude/unified';

export function track(eventName: string, properties?: Record<string, unknown>) {
  amplitude.track(eventName, properties);
}

export function identify(properties: Record<string, string | number | boolean>) {
  const obj = new amplitude.Identify();
  for (const [key, value] of Object.entries(properties)) {
    obj.set(key, value);
  }
  amplitude.identify(obj);
}

export * from './events';
