import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { BackHandler } from 'react-native';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  parseWebMessage,
  serializeNativeMessage,
  type NativeToWebMessage,
  type WebToNativeMessage,
} from './messages';

export type WebCommandHandlers = {
  [TType in WebToNativeMessage['type']]?: (
    message: Extract<WebToNativeMessage, { type: TType }>,
  ) => void | Promise<void>;
};

type PostToWeb = (message: NativeToWebMessage) => void;

export function usePostToWeb(webviewRef: RefObject<WebView | null>): PostToWeb {
  return useCallback((message) => {
    webviewRef.current?.postMessage(serializeNativeMessage(message));
  }, [webviewRef]);
}

export function useWebViewBridge(
  handlers: WebCommandHandlers,
  postToWeb: PostToWeb,
  backButtonEnabled = true,
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!backButtonEnabled) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      postToWeb({ type: 'BACK_PRESSED' });
      return true;
    });
    return () => subscription.remove();
  }, [backButtonEnabled, postToWeb]);

  return useCallback((event: WebViewMessageEvent) => {
    const message = parseWebMessage(event.nativeEvent.data);
    if (!message) return;

    void dispatchWebCommand(message, handlersRef.current);
  }, []);
}

function dispatchWebCommand(message: WebToNativeMessage, handlers: WebCommandHandlers) {
  switch (message.type) {
    case 'START_STT':
      return handlers.START_STT?.(message);
    case 'STOP_STT':
      return handlers.STOP_STT?.(message);
    case 'OPEN_SETTINGS':
      return handlers.OPEN_SETTINGS?.(message);
    case 'PLAY_TTS':
      return handlers.PLAY_TTS?.(message);
    case 'NATIVE_LOGIN':
      return handlers.NATIVE_LOGIN?.(message);
    case 'AUTH_SESSION_UPDATED':
      return handlers.AUTH_SESSION_UPDATED?.(message);
    case 'AUTH_SESSION_CLEARED':
      return handlers.AUTH_SESSION_CLEARED?.(message);
    case 'HAPTIC':
      return handlers.HAPTIC?.(message);
  }
}
