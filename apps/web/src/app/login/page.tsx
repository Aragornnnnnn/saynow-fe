// 소셜 로그인 진입 페이지 — 카카오/구글 로그인 버튼 제공
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import type { SocialProvider } from '@/lib/api';
import { clearPendingSocialLogin, startWebSocialLogin } from '@/lib/webSocialLogin';

const DEV_LOGIN_ENABLED =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, setAuth } = useAuthStore();
  const nonce = useRef<string>('');
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 이미 로그인된 경우 홈으로
  useEffect(() => {
    if (accessToken) router.replace('/');
  }, [accessToken, router]);

  useEffect(() => {
    function resetCancelledLogin() {
      nonce.current = '';
      setPendingProvider(null);
      clearPendingSocialLogin();
    }

    resetCancelledLogin();
    window.addEventListener('pageshow', resetCancelledLogin);

    return () => {
      window.removeEventListener('pageshow', resetCancelledLogin);
    };
  }, []);

  function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function startLogin(provider: SocialProvider) {
    nonce.current = generateNonce();
    setPendingProvider(provider);
    setErrorMessage(null);

    try {
      await startWebSocialLogin(provider, nonce.current);
    } catch (err) {
      setPendingProvider(null);
      setErrorMessage(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  }

  function handleDevLogin() {
    const accessToken = process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN;
    const refreshToken = process.env.NEXT_PUBLIC_DEV_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      console.warn('개발용 로그인 토큰 환경변수가 설정되지 않았습니다.');
      setErrorMessage('개발용 로그인 토큰 환경변수가 설정되지 않았습니다.');
      return;
    }

    setAuth(accessToken, refreshToken, {
      memberId: '0',
      nickname: '개발자',
      email: null,
      provider: 'GOOGLE',
      newMember: false,
    });
    router.replace('/');
  }

  return (
    <main className="flex flex-col h-dvh bg-background items-center justify-between px-6 py-10">
      {/* 상단 로고 + 캐릭터 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <Image
          src="/saynow-character.png"
          alt="SayNow 캐릭터"
          width={180}
          height={180}
          priority
          className="object-contain mix-blend-multiply"
        />
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground leading-snug">
            실제 상황으로 연습하고,<br />외국인 관점 피드백까지
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            AI와 함께, 진짜 영어 회화를 시작하세요.
          </p>
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="w-full flex flex-col gap-3 pb-safe">
        <button
          onClick={() => startLogin('KAKAO')}
          disabled={pendingProvider !== null}
          className="w-full h-14 rounded-xl bg-[#FEE500] flex items-center justify-center gap-3 font-semibold text-[#191919] text-base active:brightness-95 transition-all"
        >
          <KakaoIcon />
          {pendingProvider === 'KAKAO' ? '카카오 로그인 중...' : '카카오로 시작하기'}
        </button>
        <button
          onClick={() => startLogin('GOOGLE')}
          disabled={pendingProvider !== null}
          className="w-full h-14 rounded-xl bg-card border border-border flex items-center justify-center gap-3 font-semibold text-foreground text-base active:brightness-95 transition-all"
        >
          <GoogleIcon />
          {pendingProvider === 'GOOGLE' ? '구글 로그인 중...' : '구글로 시작하기'}
        </button>
        {errorMessage && (
          <p className="px-1 text-center text-sm leading-relaxed text-red-600">
            {errorMessage}
          </p>
        )}
        {DEV_LOGIN_ENABLED && (
          <button
            onClick={handleDevLogin}
            className="w-full h-10 rounded-xl border border-dashed border-border text-xs text-[var(--color-text-secondary)]"
          >
            임시 로그인 (개발용)
          </button>
        )}
      </div>
    </main>
  );
}

function KakaoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2C6.029 2 2 5.186 2 9.125c0 2.537 1.664 4.764 4.18 6.054l-1.065 3.965a.298.298 0 0 0 .453.325l4.794-3.175A11.4 11.4 0 0 0 11 16.25c4.971 0 9-3.186 9-7.125S15.971 2 11 2Z"
        fill="#191919"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35Z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A10 10 0 0 0 10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.405 11.9A6.02 6.02 0 0 1 4.09 10c0-.662.114-1.305.314-1.9V5.51H1.064A10 10 0 0 0 0 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59Z"
        fill="#FBBC04"
      />
      <path
        d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0A10 10 0 0 0 1.064 5.51l3.34 2.59C5.19 5.736 7.396 3.977 10 3.977Z"
        fill="#E94235"
      />
    </svg>
  );
}
