'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socialLogin, type SocialProvider } from '@/lib/api';
import {
  clearPendingSocialLogin,
  readPendingSocialLogin,
} from '@/lib/webSocialLogin';
import { useAuthStore } from '@/store/authStore';

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
  const [message, setMessage] = useState('로그인 처리 중...');

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        if (!isSocialProvider(provider)) {
          throw new Error('지원하지 않는 소셜 로그인 제공자입니다.');
        }

        const error = searchParams.get('error');
        if (error) {
          const description = searchParams.get('error_description');
          throw new Error(description ? `${error}: ${description}` : `${error}: 소셜 로그인이 취소되었습니다.`);
        }

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const pending = readPendingSocialLogin();

        if (!code || !state || !pending) {
          throw new Error('로그인 요청 정보를 찾지 못했습니다. 다시 시도해주세요.');
        }
        if (pending.provider !== provider || pending.state !== state) {
          throw new Error('로그인 요청 검증 값이 일치하지 않습니다.');
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
          throw new Error(tokenJson.error ?? '소셜 로그인 토큰 교환에 실패했습니다.');
        }

        const data = await socialLogin(provider, tokenJson.idToken, pending.nonce);
        if (cancelled) return;

        clearPendingSocialLogin();
        setAuth(data.accessToken, data.refreshToken, data.member);
        router.replace('/');
      } catch (error) {
        clearPendingSocialLogin();
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.');
        }
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [provider, router, searchParams, setAuth]);

  return (
    <main className="flex h-dvh items-center justify-center bg-background px-6">
      <div className="text-center space-y-4">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
        {message !== '로그인 처리 중...' && (
          <button onClick={() => router.replace('/login')} className="text-sm font-medium text-primary">
            다시 로그인하기
          </button>
        )}
      </div>
    </main>
  );
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
