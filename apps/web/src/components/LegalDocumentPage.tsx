'use client';

// 개인정보 처리방침 / 이용약관 공통 레이아웃

import { ChevronLeft } from 'lucide-react';
import { useBackButtonReplace } from '@/hooks/useBackButtonReplace';
import type { LegalDocument } from '@/lib/legalDocuments';

interface LegalDocumentPageProps {
  document: LegalDocument;
  backHref: string;
  backLabel: string;
}

export function LegalDocumentPage({ document, backHref, backLabel }: LegalDocumentPageProps) {
  const goBack = useBackButtonReplace(backHref);

  return (
    <main className="flex h-dvh flex-col" style={{ background: '#F2F2F7' }}>
      {/* 헤더 — 내 정보 페이지와 동일한 패턴 */}
      <header
        className="relative flex shrink-0 items-center px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 8 }}
      >
        <button
          type="button"
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 active:bg-zinc-200"
          style={{ color: '#444', marginLeft: -4 }}
          aria-label={backLabel}
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold" style={{ color: '#111' }}>
          {document.title}
        </h1>
      </header>

      {/* 본문 */}
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-190 px-5 pb-16">
          {/* 메타 정보 */}
          <div className="mt-4 mb-6 overflow-hidden rounded-xl" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: '#F2F2F7' }}>
              <span className="text-[14px]" style={{ color: '#888' }}>시행일</span>
              <span className="text-[14px] font-medium" style={{ color: '#111' }}>{document.effectiveDate}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[14px]" style={{ color: '#888' }}>문서 버전</span>
              <span className="text-[14px] font-medium" style={{ color: '#111' }}>{document.version}</span>
            </div>
          </div>

          {/* 도입부 */}
          {document.introduction.length > 0 && (
            <div className="mb-4 space-y-3">
              {document.introduction.map((paragraph) => (
                <p key={paragraph} className="text-[14px] leading-7" style={{ color: '#555' }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* 섹션 목록 */}
          <div className="space-y-3">
            {document.sections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className="overflow-hidden rounded-xl"
                style={{ background: '#fff' }}
              >
                <div className="px-4 pt-4 pb-1">
                  <h2 className="text-[15px] font-bold" style={{ color: '#111' }}>
                    {section.title}
                  </h2>
                </div>
                <div className="px-4 pb-4 mt-2 space-y-2">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-[14px] leading-7" style={{ color: '#555' }}>
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-2 list-disc space-y-1.5 pl-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="text-[14px] leading-7" style={{ color: '#555' }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
