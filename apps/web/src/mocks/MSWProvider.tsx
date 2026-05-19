// 개발 환경에서만 MSW 워커를 활성화하는 클라이언트 컴포넌트
'use client';

import { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_MSW !== 'true') {
      setReady(true);
      return;
    }

    import('./browser').then(({ worker }) => {
      worker.start({ onUnhandledRequest: 'bypass' }).then(() => setReady(true));
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
