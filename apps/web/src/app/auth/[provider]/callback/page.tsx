'use client';

import { Suspense, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socialLogin, type SocialProvider } from '@/lib/api';
import {
  clearPendingSocialLogin,
  readPendingSocialLogin,
} from '@/lib/webSocialLogin';
import { useAuthStore } from '@/store/authStore';
import { updateNativeAuthSession } from '@/bridge/commands';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { track, EVENTS } from '@/lib/analytics';

export default function SocialCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = use(params);

  return (
    <Suspense fallback={<CallbackLoading />}>
      <SocialCallbackContent provider={provider.toUpperCase()} />
    </Suspense>
  );
}

function SocialCallbackContent({ provider }: { provider: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      function redirectWithError(message: string) {
        clearPendingSocialLogin();
        router.replace(`/login?error=${encodeURIComponent(message)}`);
      }

      try {
        if (!isSocialProvider(provider)) {
          return redirectWithError('지원하지 않는 소셜 로그인 제공자입니다.');
        }

        const error = searchParams.get('error');
        if (error) {
          // 사용자가 취소한 경우 — 에러 메시지 없이 복귀
          if (error === 'access_denied') {
            clearPendingSocialLogin();
            router.replace('/login');
            return;
          }
          return redirectWithError('소셜 로그인이 취소되었습니다.');
        }

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const pending = readPendingSocialLogin();

        if (!code || !state || !pending) {
          return redirectWithError('로그인 요청 정보를 찾지 못했습니다. 다시 시도해주세요.');
        }
        if (pending.provider !== provider || pending.state !== state) {
          return redirectWithError('로그인 요청 검증 값이 일치하지 않습니다.');
        }

        const tokenResponse = await fetch('/auth/oauth-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            code,
            redirectUri: pending.redirectUri,
            codeVerifier: pending.codeVerifier,
          }),
        });
        const tokenJson = (await tokenResponse.json()) as { idToken?: string; error?: string };

        if (!tokenResponse.ok || !tokenJson.idToken) {
          return redirectWithError(tokenJson.error ?? '소셜 로그인 토큰 교환에 실패했습니다.');
        }

        const data = await socialLogin(provider, tokenJson.idToken, pending.nonce);
        if (cancelled) return;

        clearPendingSocialLogin();
        track(EVENTS.LOGIN_COMPLETED, { provider: data.user.provider.toLowerCase() });
        setAuth(data.accessToken, data.refreshToken, data.user);
        updateNativeAuthSession(data.accessToken, data.refreshToken, data.user);
        router.replace(shouldShowOnboarding(data.user) ? '/onboarding' : '/home');
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '로그인에 실패했습니다.';
          clearPendingSocialLogin();
          router.replace(`/login?error=${encodeURIComponent(message)}`);
        }
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [provider, router, searchParams, setAuth]);

  return <CallbackLoading />;
}

function CallbackLoading() {
  return (
    <main className="flex h-dvh items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </main>
  );
}

function isSocialProvider(provider: string): provider is SocialProvider {
  return provider === 'GOOGLE' || provider === 'KAKAO';
}
