'use client';

import { useEffect, useRef } from 'react';
import type { NativeToWebMessage } from './messages';
import { webBridge } from './webBridge';

type BridgeMessageType = NativeToWebMessage['type'];
type BridgeMessageOf<TType extends BridgeMessageType> = Extract<NativeToWebMessage, { type: TType }>;

export function useBridgeEvent<TType extends BridgeMessageType>(
  type: TType,
  handler: (message: BridgeMessageOf<TType>) => void,
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return webBridge.subscribe((message) => {
      if (message.type === type) {
        handlerRef.current(message as BridgeMessageOf<TType>);
      }
    });
  }, [type]);
}
