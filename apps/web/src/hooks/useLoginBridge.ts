// 소셜 로그인 postMessage 브릿지 훅 — 네이티브에서 ID Token을 받아 콜백으로 전달
'use client';

import { useEffect, useRef } from 'react';
import { SocialProvider } from '@/lib/api';

type LoginResultCallback = (provider: SocialProvider, idToken: string) => Promise<void>;

export function useLoginBridge(onLoginResult: LoginResultCallback) {
  const callbackRef = useRef(onLoginResult);

  useEffect(() => {
    callbackRef.current = onLoginResult;
  }, [onLoginResult]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;

      try {
        const data = JSON.parse(e.data);
        if (data.type === 'SOCIAL_LOGIN_RESULT') {
          callbackRef.current(data.provider as SocialProvider, data.idToken);
        }
      } catch {
        // Ignore unrelated WebView/browser messages.
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  function requestLogin(provider: SocialProvider, nonce: string) {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      // 네이티브 앱에 로그인 요청
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'REQUEST_SOCIAL_LOGIN', provider, nonce })
      );
    } else {
      // 브라우저 개발 환경 — 실제 SDK 없이 흐름만 확인하는 mock
      console.warn(
        `[LoginBridge] 네이티브 앱 환경이 아닙니다. provider=${provider}, nonce=${nonce}`
      );
      console.warn('[LoginBridge] 실제 로그인은 Expo 앱 환경에서만 동작합니다.');
    }
  }

  return { requestLogin };
}
