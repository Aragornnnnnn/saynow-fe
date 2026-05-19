// 시나리오 선택 페이지 상단 카테고리 필터 칩
'use client';

import { useEffect, useState } from 'react';
import { ApiCategory } from '@/lib/api';

interface CategoryFilterProps {
  categories: ApiCategory[];
  selectedId: number | null;
  onChange: (categoryId: number | null) => void;
}

const CATEGORY_NAME_MAP: Record<string, string> = {
  Cafe: '카페',
  Airport: '공항',
  Hotel: '호텔',
  Restaurant: '식당',
  Taxi: '택시',
};

export function CategoryFilter({ categories, selectedId, onChange }: CategoryFilterProps) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const id = setTimeout(() => setShowToast(false), 2500);
    return () => clearTimeout(id);
  }, [showToast]);

  return (
    <div className="relative">
      <div className='flex gap-2 overflow-x-auto pb-1 no-scrollbar'>
        {categories.map((cat) => {
          const isActive = selectedId === cat.categoryId;
          const isLocked = cat.categoryLocked;

          return (
            <button
              key={cat.categoryId}
              onClick={() => isLocked ? setShowToast(true) : onChange(isActive ? null : cat.categoryId)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isLocked
                  ? 'bg-[#EFEFED] text-muted-foreground/50 cursor-default'
                  : isActive
                    ? 'bg-primary text-white'
                    : 'bg-[#EFEFED] text-muted-foreground'
              }`}
            >
              <span>{CATEGORY_NAME_MAP[cat.categoryName] ?? cat.categoryName}</span>
              {isLocked && <span className='text-xs'>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* 토스트 */}
      <div className={`absolute left-1/2 -translate-x-1/2 top-12 z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
        <div className="whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg border border-border">
          🔒 정식 출시 때 공개될 예정이에요
        </div>
      </div>
    </div>
  );
}
