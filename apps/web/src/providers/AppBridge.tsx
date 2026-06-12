// 앱 전역 브릿지 이벤트를 수신하는 클라이언트 컴포넌트
'use client';

import { useCallback } from 'react';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';

export function AppBridge({ children }: { children: React.ReactNode }) {
  // APP_VERSION_INFO 수신 — 추후 업데이트 모달 구현 예정
  useBridgeEvent('APP_VERSION_INFO', useCallback(() => {}, []));

  return <>{children}</>;
}
