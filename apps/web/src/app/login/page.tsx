// 소셜 로그인 진입 페이지 — 카카오/구글 로그인 버튼 제공
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTypingLoop } from '@/hooks/useTypingLoop';
import { generateRandomHex } from '@/lib/crypto';

const HOOK_MESSAGES = [
  '말했는데 돌아온 건 "Sorry?" 였어요',
  '말은 했는데 외국인 표정이 이상했어요',
  '눈치로 때웠는데 맞게 전달됐을까요?',
  '아는 단어만 골라 말했는데 통했을까요?',
  '영어로 말했는데 한번에 알아들었을까요?',
];
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { requestNativeLogin, triggerHaptic, updateNativeAuthSession, exitApp } from '@/bridge/commands';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import { webBridge } from '@/bridge/webBridge';
import { useAuthStore } from '@/store/authStore';
import type { SocialProvider } from '@/lib/api';
import { clearPendingSocialLogin, startWebSocialLogin } from '@/lib/webSocialLogin';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { track, EVENTS } from '@/lib/analytics';

const LAST_LOGIN_KEY = 'landit-last-login';

function haptic() {
  if (webBridge.isAvailable()) triggerHaptic('light');
  else navigator.vibrate?.(6);
}

function hapticClear() {
  if (webBridge.isAvailable()) triggerHaptic('medium');
  else navigator.vibrate?.(15);
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, setAuth } = useAuthStore();
  const nonce = useRef<string>('');
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => searchParams.get('error'));
  const [lastProvider, setLastProvider] = useState<SocialProvider | null>(null);
  const isPending = pendingProvider !== null;
  useBackButtonBridge(() => exitApp());
  const typingText = useTypingLoop(HOOK_MESSAGES, haptic, hapticClear, !isPending);

  useEffect(() => {
    if (accessToken) router.replace('/home');
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

  async function startLogin(provider: SocialProvider) {
    setErrorMessage(null);
    setPendingProvider(provider);
    track(EVENTS.LOGIN_STARTED, { provider: provider.toLowerCase() });

    if (webBridge.isAvailable()) {
      requestNativeLogin(provider);
      return;
    }

    nonce.current = generateRandomHex(16);
    try {
      await startWebSocialLogin(provider, nonce.current);
    } catch (err) {
      setPendingProvider(null);
      setErrorMessage(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  }

  function onLoginSuccess(accessToken: string, refreshToken: string, member: Parameters<typeof setAuth>[2]) {
    localStorage.setItem(LAST_LOGIN_KEY, member.provider as SocialProvider);
    track(EVENTS.LOGIN_COMPLETED, { provider: (member.provider as string).toLowerCase() });
    setAuth(accessToken, refreshToken, member);
    updateNativeAuthSession(accessToken, refreshToken, member);
    router.replace(shouldShowOnboarding(member) ? '/onboarding' : '/home');
  }

  useBridgeEvent('NATIVE_LOGIN_SUCCESS', (msg) => {
    onLoginSuccess(msg.accessToken, msg.refreshToken, msg.member);
  });

  useBridgeEvent('NATIVE_LOGIN_ERROR', (msg) => {
    setPendingProvider(null);
    setErrorMessage(msg.message);
  });

  return (
    <motion.main
      className="flex flex-col h-dvh bg-background items-center justify-between px-6 py-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full" />
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground leading-snug">
            외국인한테<br />내 영어가 통할지 알려드려요
          </h1>
          <p className="text-lg text-muted-foreground h-7">
            {typingText}<span className="animate-pulse">|</span>
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
          className="bg-white text-foreground shadow-sm ring-1 ring-border"
          icon={<GoogleIcon />}
        />
        {errorMessage && (
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </div>
    </motion.main>
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
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
          <span className="relative block bg-primary text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-primary">
            최근 로그인
          </span>
        </div>
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
