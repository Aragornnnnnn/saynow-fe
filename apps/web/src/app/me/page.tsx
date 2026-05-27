'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  LogOut,
  ShieldCheck,
  UserRound,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { clearNativeAuthSession } from '@/bridge/commands';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { logout as requestLogout } from '@/lib/api/auth';
import { deleteAccount } from '@/lib/api/member';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

export default function MyPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { member, refreshToken, clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const goHome = useBackButtonReplace('/');

  if (!isReady) return null;

  const displayName = member?.nickname?.trim() || member?.email || 'SayNow 사용자';
  const emailText = member?.email ?? '이메일 정보 없음';
  const providerText = getProviderLabel(member?.provider);

  function finishSignedOut() {
    clearAuth();
    clearNativeAuthSession();
    router.replace('/login');
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      if (refreshToken) {
        await requestLogout(refreshToken);
      }
    } catch (error) {
      console.warn('[Auth] logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      finishSignedOut();
    }
  }

  async function handleDeleteAccount() {
    if (isDeletingAccount) return;

    setIsDeletingAccount(true);
    setDeleteErrorMessage(null);
    try {
      await deleteAccount();
      finishSignedOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : '회원탈퇴에 실패했습니다.';
      setDeleteErrorMessage(message);
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <motion.main
      className="flex h-dvh flex-col bg-background"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-6">
        <button
          type="button"
          onClick={goHome}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:bg-secondary"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold text-foreground">내 정보</h1>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6">
        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <UserRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{emailText}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-secondary px-3 py-2">
              <dt className="text-xs text-muted-foreground">로그인 방식</dt>
              <dd className="mt-0.5 font-medium text-foreground">{providerText}</dd>
            </div>
            <div className="rounded-lg bg-secondary px-3 py-2">
              <dt className="text-xs text-muted-foreground">회원 ID</dt>
              <dd className="mt-0.5 truncate font-medium text-foreground">
                {member?.userId ?? '-'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <MenuLink
            href="/me/privacy"
            icon={ShieldCheck}
            title="개인정보 처리방침"
          />
          <MenuLink
            href="/me/terms"
            icon={FileText}
            title="서비스 이용약관"
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <MenuButton
            icon={UserX}
            title="회원탈퇴"
            tone="danger"
            onClick={() => {
              setDeleteErrorMessage(null);
              setIsDeleteDialogOpen(true);
            }}
          />
          <MenuButton
            icon={LogOut}
            title={isLoggingOut ? '로그아웃 중' : '로그아웃'}
            onClick={handleLogout}
            disabled={isLoggingOut}
          />
        </section>
      </div>

      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 px-4 pb-4">
          <div className="w-full rounded-xl bg-card p-5 shadow-lg">
            <h2 className="text-lg font-bold text-foreground">회원탈퇴</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              계정과 이용 기록이 삭제됩니다. 계속 진행할까요?
            </p>
            {deleteErrorMessage && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteErrorMessage}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeletingAccount}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleDeleteAccount}
                loading={isDeletingAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? '처리 중' : '탈퇴하기'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.main>
  );
}

function MenuLink({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 border-b border-border px-4 text-left last:border-b-0 active:bg-secondary"
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 text-sm font-medium text-foreground">{title}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  title,
  tone = 'default',
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}) {
  const textColor = tone === 'danger' ? 'text-red-600' : 'text-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center gap-3 border-b border-border px-4 text-left last:border-b-0 active:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className={`h-5 w-5 shrink-0 ${tone === 'danger' ? 'text-red-500' : 'text-muted-foreground'}`} aria-hidden="true" />
      <span className={`flex-1 text-sm font-medium ${textColor}`}>{title}</span>
    </button>
  );
}

function getProviderLabel(provider?: string) {
  switch (provider) {
    case 'GOOGLE':
      return '구글';
    case 'KAKAO':
      return '카카오';
    default:
      return '알 수 없음';
  }
}
