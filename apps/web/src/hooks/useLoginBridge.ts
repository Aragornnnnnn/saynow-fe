// 소셜 로그인 postMessage 브릿지 훅 — 네이티브에서 ID Token을 받아 콜백으로 전달
'use client';

import { useEffect, useRef } from 'react';
import { requestNativeSocialLogin } from '@/bridge/commands';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { SocialProvider } from '@/lib/api';

type LoginResultCallback = (provider: SocialProvider, idToken: string) => Promise<void>;

export function useLoginBridge(onLoginResult: LoginResultCallback) {
  const callbackRef = useRef(onLoginResult);

  useEffect(() => {
    callbackRef.current = onLoginResult;
  }, [onLoginResult]);

  useBridgeEvent('SOCIAL_LOGIN_RESULT', (message) => {
    callbackRef.current(message.provider as SocialProvider, message.idToken);
  });

  function requestLogin(provider: SocialProvider, nonce: string) {
    if (!requestNativeSocialLogin(provider, nonce)) {
      console.warn(
        `[LoginBridge] 네이티브 앱 환경이 아닙니다. provider=${provider}, nonce=${nonce}`
      );
      console.warn('[LoginBridge] 실제 로그인은 Expo 앱 환경에서만 동작합니다.');
    }
  }

  return { requestLogin };
}
