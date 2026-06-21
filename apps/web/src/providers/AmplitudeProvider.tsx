// Amplitude 초기화 및 플랫폼 유저 속성 설정 Provider
'use client';

import { useEffect } from 'react';
import * as amplitude from '@amplitude/unified';
import { webBridge } from '@/bridge/webBridge';
import { identify, track, EVENTS } from '@/lib/analytics';

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
let initialized = false;

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    amplitude.initAll(API_KEY, {
      analytics: { defaultTracking: false },
      sessionReplay: { sampleRate: 1 },
    });

    if (!webBridge.isAvailable()) {
      // 웹: identify 먼저 → App Opened에 유저 속성이 붙도록
      identify({ platform: 'web', environment: ENV });
      track(EVENTS.APP_OPENED);
      return;
    }

    // 네이티브 앱: App Opened 먼저 쏘고, 플랫폼 정보는 브릿지로 비동기 수신
    track(EVENTS.APP_OPENED);
    const unsub = webBridge.subscribe((msg) => {
      if (msg.type !== 'APP_VERSION_INFO') return;
      identify({
        platform: msg.platform.toLowerCase(),
        environment: ENV,
        ...(msg.versionName ? { app_version: msg.versionName } : {}),
      });
      unsub();
    });

    return () => unsub();
  }, []);

  return <>{children}</>;
}
