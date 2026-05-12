'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useBackButtonBridge } from '@/hooks/useBackButtonBridge';
import type { LegalDocument } from '@/lib/legalDocuments';

interface LegalDocumentPageProps {
  document: LegalDocument;
  backHref: string;
  backLabel: string;
}

export function LegalDocumentPage({
  document,
  backHref,
  backLabel,
}: LegalDocumentPageProps) {
  const router = useRouter();

  function goBack() {
    router.replace(backHref);
  }

  useBackButtonBridge(goBack);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3 px-4 pb-3 pt-6 sm:px-8">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:bg-secondary"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="truncate text-xl font-bold text-foreground">{document.title}</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-5 pb-16 sm:px-8">
        <section className="border-b border-border py-10 sm:py-12">
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {document.title}
          </h1>
          <dl className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="font-medium text-foreground">시행일</dt>
              <dd>{document.effectiveDate}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-foreground">문서 버전</dt>
              <dd>{document.version}</dd>
            </div>
          </dl>
          <div className="mt-8 space-y-3">
            {document.introduction.map((paragraph) => (
              <p key={paragraph} className="text-[15px] leading-7 text-[#374151]">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section>
          {document.sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="border-b border-border py-9 last:border-b-0"
            >
              <h2 className="text-xl font-bold leading-7 text-foreground">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-7 text-[#374151]">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 list-disc space-y-2 pl-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="text-[15px] leading-7 text-[#374151]">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
