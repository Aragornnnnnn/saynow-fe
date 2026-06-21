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
      sessionReplay: { sampleRate: 1 },
    });
    track(EVENTS.APP_OPENED);

    if (!webBridge.isAvailable()) {
      identify({ platform: 'web', environment: ENV });
      return;
    }

    // 네이티브 앱: APP_VERSION_INFO 브릿지 이벤트로 플랫폼·버전 수신
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
