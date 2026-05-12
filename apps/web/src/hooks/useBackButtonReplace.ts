'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBackButtonBridge } from './useBackButtonBridge';

export function useBackButtonReplace(href: string) {
  const router = useRouter();
  const replace = useCallback(() => {
    router.replace(href);
  }, [href, router]);

  useBackButtonBridge(replace);

  return replace;
}
