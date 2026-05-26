// 브리핑 화면 UI 변형 비교용 프리뷰 페이지 (개발용)
'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

const MOCK = {
  title: '공항에서 입국심사 받기',
  situation: '심사관이 당신을 기다리고 있어요. 여행 목적과 체류 기간을 영어로 설명해야 합니다.',
  goal: '입국 목적과 체류 정보를 설명하고 입국심사를 통과할 수 있다.',
  emoji: '🛂',
  bgUrl: '/images/scenarios/scenario-4-play.webp',
};

const VARIANTS = ['A', 'B', 'C', 'D'] as const;
type Variant = typeof VARIANTS[number];

const VARIANT_LABELS: Record<Variant, string> = {
  A: '그라데이션',
  B: '2-zone',
  C: '카드',
  D: '넷플릭스',
};

export default function BriefingPreview() {
  const [variant, setVariant] = useState<Variant>('A');

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* 탭 선택 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex gap-1 rounded-full bg-black/60 backdrop-blur-sm p-1">
        {VARIANTS.map((v) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              variant === v ? 'bg-white text-black' : 'text-white/70'
            }`}
          >
            {v} · {VARIANT_LABELS[v]}
          </button>
        ))}
      </div>

      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      {variant === 'D' && <VariantD />}
    </div>
  );
}

/* ─────────────────────────────────────────
   A. 그라데이션 최적화
   - 이미지 하단 캐릭터 영역까지 충분히 덮는 ease-in 그라데이션
   - 텍스트 계층: 제목(크게) > 상황(보통) > 목표(작게, 색 낮춤)
   - 캐릭터와 텍스트가 겹치지 않도록 pb 충분히 확보
───────────────────────────────────────── */
function VariantA() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `url(${MOCK.bgUrl})`, backgroundColor: '#a07860' }} />
      {/* 완만한 ease-in 커브 — 중간 구간을 부드럽게 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: '72%', background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.93) 20%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.45) 58%, rgba(0,0,0,0.15) 75%, transparent 100%)' }} />

      <div className="relative z-20 flex items-center px-4 pt-16">
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="relative z-20 flex-1" />

      <div className="relative z-20 px-5 pb-12 space-y-5">
        <div>
          <h2 className="text-[26px] font-bold text-white leading-tight tracking-tight mb-4">{MOCK.title}</h2>
          <p className="text-[15px] text-white/90 leading-relaxed mb-4">{MOCK.situation}</p>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-white">목표</span>
            <p className="text-[13px] text-white/80 leading-relaxed">{MOCK.goal}</p>
          </div>
        </div>
        <button className="w-full rounded-2xl bg-white py-4 text-base font-bold text-primary active:opacity-80">
          도전할게요 →
        </button>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────
   B. 2-zone — 이미지와 텍스트 완전 분리 (Apple TV 스타일)
   - 상단 55%: 이미지 (캐릭터 전체 노출)
   - 하단 45%: 어두운 배경에 텍스트
   - 이미지와 텍스트가 절대 싸우지 않음
───────────────────────────────────────── */
function VariantB() {
  return (
    <main className="flex h-dvh flex-col bg-[#111]">
      {/* 이미지 존 */}
      <div className="relative shrink-0" style={{ height: '52%' }}>
        <div className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `url(${MOCK.bgUrl})`, backgroundColor: '#a07860' }} />
        {/* 자연스러운 페이드 아웃 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(to top, #111 0%, transparent 100%)' }} />
        <div className="relative z-10 flex items-center px-4 pt-16">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white">
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      {/* 텍스트 존 */}
      <div className="flex flex-1 flex-col justify-between px-5 pb-10 pt-1">
        <div className="space-y-3">
          <h2 className="text-[22px] font-bold text-white leading-tight">{MOCK.title}</h2>
          <p className="text-[14px] text-white/75 leading-relaxed">{MOCK.situation}</p>
          <div className="pt-1 border-t border-white/10">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">달성 목표</span>
            <p className="mt-1 text-[13px] text-white/55 leading-relaxed">{MOCK.goal}</p>
          </div>
        </div>
        <button className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80">
          도전할게요
        </button>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────
   C. Frosted glass 카드 (게임 스테이지 진입 스타일)
   - 풀스크린 이미지 + 하단 frosted 카드
   - 카드가 이미지 위에 float하는 느낌
   - 텍스트 가독성 완전 보장
───────────────────────────────────────── */
function VariantC() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `url(${MOCK.bgUrl})`, backgroundColor: '#a07860' }} />
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      <div className="relative z-20 flex items-center px-4 pt-16">
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="relative z-20 flex-1" />

      <div className="relative z-20 px-4 pb-8">
        {/* Frosted glass 카드 */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(12,12,12,0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
          <div className="px-5 pt-6 pb-5 space-y-4">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">{MOCK.emoji}</span>
              <h2 className="text-[18px] font-bold text-white leading-tight">{MOCK.title}</h2>
            </div>
            {/* 상황 */}
            <p className="text-[14px] text-white/80 leading-relaxed">{MOCK.situation}</p>
            {/* 목표 구분선 */}
            <div className="border-t border-white/8 pt-4">
              <p className="text-[11px] font-semibold text-primary mb-1.5 uppercase tracking-wide">달성 목표</p>
              <p className="text-[13px] text-white/65 leading-relaxed">{MOCK.goal}</p>
            </div>
          </div>
          <div className="px-4 pb-5">
            <button className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80">
              도전할게요
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────
   D. 넷플릭스 스타일
   - 이미지 전체 + 강한 비네팅
   - 텍스트가 이미지를 "설명"이 아닌 이미지가 "분위기" 역할
   - 제목 크게, 설명 간결하게, 목표는 태그로 처리
───────────────────────────────────────── */
function VariantD() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `url(${MOCK.bgUrl})`, backgroundColor: '#a07860' }} />
      {/* 상하 비네팅 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 30%, rgba(0,0,0,0.5) 55%, transparent 100%)' }} />

      <div className="relative z-20 flex items-center px-4 pt-16">
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-white">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="relative z-20 flex-1" />

      <div className="relative z-20 px-5 pb-12">
        {/* 목표 태그 */}
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-md bg-primary/90 px-2 py-0.5 text-[11px] font-bold text-white">목표</span>
          <span className="text-[12px] text-white/60 leading-relaxed line-clamp-1">{MOCK.goal}</span>
        </div>
        {/* 제목 — 크게 */}
        <h2 className="text-[28px] font-extrabold text-white leading-tight tracking-tight mb-3">{MOCK.title}</h2>
        {/* 상황 설명 */}
        <p className="text-[14px] text-white/80 leading-relaxed mb-6">{MOCK.situation}</p>

        <button className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80">
          도전할게요
        </button>
      </div>
    </main>
  );
}
