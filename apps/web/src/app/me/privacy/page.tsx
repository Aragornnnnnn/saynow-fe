import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pb-3 pt-6">
        <Link
          href="/me"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:bg-secondary"
          aria-label="내 정보로 돌아가기"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">개인정보 처리방침</h1>
      </header>

      <section className="px-4 py-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            개인정보 처리방침은 준비 중입니다.
          </p>
        </div>
      </section>
    </main>
  );
}
