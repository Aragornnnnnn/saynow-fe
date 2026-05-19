// 개발 환경에서만 MSW 워커를 활성화하는 클라이언트 컴포넌트
'use client';

import { useEffect, useState } from 'react';

const isMswEnabled =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_MSW === 'true';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isMswEnabled);

  useEffect(() => {
    if (!isMswEnabled) return;

    import('./browser').then(({ worker }) => {
      worker.start({ onUnhandledRequest: 'bypass' }).then(() => setReady(true));
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
