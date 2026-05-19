// 소셜 로그인 진입 페이지 — 카카오/구글 로그인 버튼 제공
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { requestNativeLogin } from '@/bridge/commands';
import { webBridge } from '@/bridge/webBridge';
import { useAuthStore } from '@/store/authStore';
import { updateNativeAuthSession } from '@/bridge/commands';
import type { SocialProvider } from '@/lib/api';
import { clearPendingSocialLogin, startWebSocialLogin } from '@/lib/webSocialLogin';

const LAST_LOGIN_KEY = 'saynow-last-login';

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, setAuth } = useAuthStore();
  const nonce = useRef<string>('');
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<SocialProvider | null>(null);

  useEffect(() => {
    if (accessToken) router.replace('/');
  }, [accessToken, router]);

  useEffect(() => {
    const saved = localStorage.getItem(LAST_LOGIN_KEY) as SocialProvider | null;
    if (saved === 'KAKAO' || saved === 'GOOGLE') setLastProvider(saved);

    function resetCancelledLogin() {
      nonce.current = '';
      setPendingProvider(null);
      clearPendingSocialLogin();
    }

    resetCancelledLogin();
    window.addEventListener('pageshow', resetCancelledLogin);
    return () => window.removeEventListener('pageshow', resetCancelledLogin);
  }, []);

  function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function startLogin(provider: SocialProvider) {
    setErrorMessage(null);
    setPendingProvider(provider);

    if (webBridge.isAvailable()) {
      requestNativeLogin(provider);
      return;
    }

    nonce.current = generateNonce();
    try {
      await startWebSocialLogin(provider, nonce.current);
    } catch (err) {
      setPendingProvider(null);
      setErrorMessage(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  }

  function onLoginSuccess(accessToken: string, refreshToken: string, member: Parameters<typeof setAuth>[2]) {
    localStorage.setItem(LAST_LOGIN_KEY, member.provider as SocialProvider);
    setAuth(accessToken, refreshToken, member);
    updateNativeAuthSession(accessToken, refreshToken, member);
    router.replace('/');
  }

  useBridgeEvent('NATIVE_LOGIN_SUCCESS', (msg) => {
    onLoginSuccess(msg.accessToken, msg.refreshToken, msg.member);
  });

  useBridgeEvent('NATIVE_LOGIN_ERROR', (msg) => {
    setPendingProvider(null);
    setErrorMessage(msg.message);
  });

  const isPending = pendingProvider !== null;

  return (
    <main className="flex flex-col h-dvh bg-background items-center justify-between px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <Image
          src="/saynow-character.webp"
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
          <p className="text-sm text-muted-foreground">
            AI와 함께, 진짜 영어 회화를 시작하세요.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3 pb-safe">
        <LoginButton
          onClick={() => startLogin('KAKAO')}
          disabled={isPending}
          pending={pendingProvider === 'KAKAO'}
          pendingLabel="카카오 로그인 중..."
          label="카카오로 로그인하기"
          showBadge={lastProvider === 'KAKAO'}
          className="bg-[#FEE500] text-[#191919] shadow-sm"
          icon={<KakaoIcon />}
        />
        <LoginButton
          onClick={() => startLogin('GOOGLE')}
          disabled={isPending}
          pending={pendingProvider === 'GOOGLE'}
          pendingLabel="구글 로그인 중..."
          label="구글로 로그인하기"
          showBadge={lastProvider === 'GOOGLE'}
          className="bg-white text-foreground shadow-sm"
          icon={<GoogleIcon />}
        />
        {errorMessage && (
          <p className="px-1 text-center text-sm leading-relaxed text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    </main>
  );
}

function LoginButton({
  onClick,
  disabled,
  pending,
  pendingLabel,
  label,
  showBadge,
  className,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  pending: boolean;
  pendingLabel: string;
  label: string;
  showBadge: boolean;
  className: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative">
      {showBadge && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-10 whitespace-nowrap">
          지난번에 사용
        </span>
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full h-14 rounded-xl flex items-center justify-center gap-3 font-semibold text-base active:brightness-95 transition-all disabled:opacity-60 ${className}`}
      >
        {icon}
        {pending ? pendingLabel : label}
      </button>
    </div>
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
