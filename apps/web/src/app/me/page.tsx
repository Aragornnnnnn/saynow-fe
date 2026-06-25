'use client';

// 내 정보 페이지 — 프로필 헤더 + 메뉴 목록

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clearNativeAuthSession } from '@/bridge/commands';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { logout as requestLogout } from '@/lib/api/auth';
import { deleteAccount } from '@/lib/api/member';
import { useAuthStore } from '@/store/authStore';
import { track, EVENTS } from '@/lib/analytics';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useScrollShadow } from '@/hooks/useScrollShadow';

export default function MyPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { member, refreshToken, clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [labTapCount, setLabTapCount] = useState(0);
  const goHome = useBackButtonReplace('/home');
  const { ref: scrollRef, onScroll, hasShadow } = useScrollShadow();

  function handleLabTap() {
    setLabTapCount((n) => {
      const next = n + 1;
      if (next >= 6) {
        router.push('/stt-test');
        return 0;
      }
      const remaining = 6 - next;
      if (remaining <= 3) toast(`${remaining}번 더 탭하면 실험실이 열려요`);
      return next;
    });
  }

  if (!isReady) return null;

  const displayName = member?.nickname?.trim() || 'Landit 사용자';
  const emailText = member?.email ?? '';

  function finishSignedOut() {
    clearAuth();
    clearNativeAuthSession();
    router.replace('/login');
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      if (refreshToken) await requestLogout(refreshToken);
    } catch (error) {
      console.warn('[Auth] logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      track(EVENTS.LOGOUT_COMPLETED);
      finishSignedOut();
    }
  }

  async function handleDeleteAccount() {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    setDeleteErrorMessage(null);
    try {
      await deleteAccount();
      track(EVENTS.ACCOUNT_DELETION_COMPLETED);
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
      {/* 헤더 */}
      <header
        className="relative flex items-center px-4 transition-shadow duration-200"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
          paddingBottom: 8,
          borderBottom: '1px solid #ebebeb',
          boxShadow: hasShadow ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <button
          type="button"
          onClick={goHome}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 active:bg-zinc-200"
          style={{ color: '#444', marginLeft: -4 }}
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold" style={{ color: '#111' }}>
          내 정보
        </h1>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="no-scrollbar flex-1 overflow-y-auto" style={{ background: '#F2F2F7' }}>
        {/* 프로필 섹션 */}
        <div className="px-5 pb-5 pt-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full text-4xl"
              style={{ background: '#E8F4E8' }}
            >
              🐨
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-bold leading-tight" style={{ color: '#111' }}>
                {displayName}
              </p>
              {emailText ? (
                <p className="mt-0.5 truncate text-[14px]" style={{ color: '#888' }}>
                  {emailText}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <StatChip label="연습 횟수" value={`${member?.userId ? '-' : '0'}회`} />
            <StatChip label="로그인" value={getProviderLabel(member?.provider)} onClick={handleLabTap} />
          </div>
        </div>

        {/* 메뉴 그룹 */}
        <div className="px-4 pb-8 space-y-3">
          {/* 약관 그룹 */}
          <MenuGroup>
            <MenuLink href="/me/privacy" title="개인정보 처리방침" />
            <MenuLink href="/me/terms" title="서비스 이용약관" />
          </MenuGroup>

          {/* 계정 관리 */}
          <MenuGroup>
            <MenuButton
              title={isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              onClick={handleLogout}
              disabled={isLoggingOut}
            />
            <MenuButton
              title="회원탈퇴"
              tone="danger"
              onClick={() => {
                setDeleteErrorMessage(null);
                setIsDeleteSheetOpen(true);
              }}
            />
          </MenuGroup>
        </div>
      </div>

      {/* 회원탈퇴 확인 바텀시트 */}
      <BottomSheet open={isDeleteSheetOpen} onClose={() => !isDeletingAccount && setIsDeleteSheetOpen(false)}>
        <h2 className="text-[17px] font-bold" style={{ color: '#111' }}>회원탈퇴</h2>
        <p className="mt-2 text-[14px] leading-6" style={{ color: '#666' }}>
          계정과 이용 기록이 삭제됩니다. 계속 진행할까요?
        </p>
        {deleteErrorMessage && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {deleteErrorMessage}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setIsDeleteSheetOpen(false)}
            disabled={isDeletingAccount}
          >
            닫기
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleDeleteAccount}
            loading={isDeletingAccount}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? '처리 중' : '탈퇴할게요'}
          </Button>
        </div>
      </BottomSheet>
    </motion.main>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function StatChip({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <div
      className="flex flex-col rounded-xl px-3.5 py-2.5"
      style={{ background: '#fff', minWidth: 80 }}
      onClick={onClick}
    >
      <span className="text-[11px]" style={{ color: '#999' }}>{label}</span>
      <span className="mt-0.5 text-[15px] font-semibold" style={{ color: '#111' }}>{value}</span>
    </div>
  );
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ background: '#fff' }}>
      {children}
    </div>
  );
}

function MenuLink({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[52px] items-center justify-between border-b px-4 last:border-b-0 active:bg-gray-50"
      style={{ borderColor: '#F2F2F7' }}
    >
      <span className="text-[15px]" style={{ color: '#111' }}>{title}</span>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#C7C7CC' }} aria-hidden="true" />
    </Link>
  );
}

function MenuButton({
  title,
  tone = 'default',
  disabled,
  onClick,
}: {
  title: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] w-full items-center justify-between border-b px-4 last:border-b-0 active:bg-gray-50 disabled:opacity-50"
      style={{ borderColor: '#F2F2F7' }}
    >
      <span
        className="text-[15px]"
        style={{ color: tone === 'danger' ? '#FF3B30' : '#111' }}
      >
        {title}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#C7C7CC' }} aria-hidden="true" />
    </button>
  );
}

function getProviderLabel(provider?: string) {
  switch (provider) {
    case 'GOOGLE': return '구글';
    case 'KAKAO': return '카카오';
    default: return '-';
  }
}
