'use client';

import {
  parseNativeMessage,
  serializeWebMessage,
  type NativeToWebMessage,
  type WebToNativeMessage,
} from './messages';

type BridgeListener = (message: NativeToWebMessage) => void;

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

function isAvailable() {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView;
}

function send(message: WebToNativeMessage) {
  if (!isAvailable()) return false;
  window.ReactNativeWebView?.postMessage(serializeWebMessage(message));
  return true;
}

function subscribe(listener: BridgeListener) {
  const handler = (event: MessageEvent) => {
    const message = parseNativeMessage(event.data);
    if (message) listener(message);
  };

  window.addEventListener('message', handler);
  document.addEventListener('message', handler as EventListener);

  return () => {
    window.removeEventListener('message', handler);
    document.removeEventListener('message', handler as EventListener);
  };
}

export const webBridge = {
  isAvailable,
  send,
  subscribe,
};
