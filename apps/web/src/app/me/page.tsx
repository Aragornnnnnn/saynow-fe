'use client';

// 내 정보 페이지 — 프로필 헤더 + 메뉴 목록

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clearNativeAuthSession, triggerHaptic } from '@/bridge/commands';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { logout as requestLogout } from '@/lib/api/auth';
import { deleteAccount } from '@/lib/api/member';
import { submitNps } from '@/lib/api/feedback';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { webBridge } from '@/bridge/webBridge';

const EMOJIS = ['😩', '😟', '😶', '😄', '🤩'] as const;
type EmojiScore = 1 | 2 | 3 | 4 | 5;

export default function MyPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { member, refreshToken, clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);
  const [labTapCount, setLabTapCount] = useState(0);
  const goHome = useBackButtonReplace('/');

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

  const displayName = member?.nickname?.trim() || 'SayNow 사용자';
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
      {/* 헤더 */}
      <header
        className="relative flex items-center px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 8, borderBottom: '1px solid #ebebeb' }}
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

      <div className="no-scrollbar flex-1 overflow-y-auto" style={{ background: '#F2F2F7' }}>
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

          {/* 서비스 피드백 */}
          <MenuGroup>
            <MenuButton
              title="서비스 피드백"
              onClick={() => setIsFeedbackSheetOpen(true)}
            />
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

      {/* 서비스 피드백 바텀시트 */}
      <BottomSheet open={isFeedbackSheetOpen} onClose={() => setIsFeedbackSheetOpen(false)}>
        <FeedbackSheetContent onDone={() => setIsFeedbackSheetOpen(false)} />
      </BottomSheet>

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

// ─── 서비스 피드백 바텀시트 콘텐츠 ───────────────────────────────────────────────

function FeedbackSheetContent({ onDone }: { onDone: () => void }) {
  const [score, setScore] = useState<EmojiScore | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const needsComment = score !== null && score <= 2;

  function handleSelect(s: EmojiScore) {
    if (webBridge.isAvailable()) triggerHaptic('light');
    setScore(s);
    if (s > 2) setComment('');
  }

  async function handleSubmit() {
    if (score !== null) {
      try {
        await submitNps(0, score, comment || undefined);
      } catch {
        // 제출 실패해도 UX 차단 안 함
      }
    }
    setSubmitted(true);
    setTimeout(onDone, 1200);
  }

  if (submitted) {
    return (
      <div className="py-6 flex flex-col items-center gap-2">
        <span className="tossface text-4xl">🙏</span>
        <p className="text-base font-bold text-zinc-800">소중한 피드백 감사해요!</p>
        <p className="text-sm text-zinc-500">더 나은 서비스로 돌아올게요</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-foreground">SayNow 어떠세요?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">솔직하게 말해줘요, 다 듣고 반영할게요</p>
        </div>
        <button onClick={onDone} className="text-xl leading-none text-muted-foreground">
          ✕
        </button>
      </div>

      <div className="mb-7 flex justify-between">
        {EMOJIS.map((emoji, i) => {
          const s = (i + 1) as EmojiScore;
          const selected = score === s;
          const dimmed = score !== null && !selected;
          return (
            <motion.button
              key={emoji}
              onClick={() => handleSelect(s)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: selected ? 1.25 : 1,
                opacity: dimmed ? 0.3 : 1,
                y: selected ? -6 : 0,
              }}
              transition={{
                scale: { type: 'spring', stiffness: 420, damping: 18, delay: score === null ? 0.05 + i * 0.07 : 0 },
                opacity: { duration: 0.15 },
                y: { type: 'spring', stiffness: 420, damping: 18 },
              }}
              whileTap={{ scale: 0.8 }}
              className="relative flex flex-col items-center pb-3"
            >
              <span className="tossface text-4xl">{emoji}</span>
              <AnimatePresence>
                {selected && (
                  <motion.div
                    key="dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {needsComment && (
          <motion.div
            key="comment"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-foreground">어떤 점이 아쉬우셨나요?</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="대화 흐름, 발음, AI 피드백 등 자유롭게 적어주세요"
                className="w-full resize-none rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                autoFocus
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{comment.length} / 300</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button size="md" onClick={handleSubmit} disabled={score === null}>
        {score === null ? '이모지를 선택해줘요' : '제출할게요'}
      </Button>
    </>
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
