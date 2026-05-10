'use client';

import { useBridgeEvent } from '@/bridge/useBridgeEvent';

export function useBackButtonBridge(onBackPressed: () => void) {
  useBridgeEvent('BACK_PRESSED', onBackPressed);
}
