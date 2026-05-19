// 시나리오 선택 페이지 상단 카테고리 필터 칩
'use client';

import { ApiCategory } from '@/lib/api';

const CATEGORY_EMOJI: Record<string, string> = {
  Cafe: '☕',
  Airport: '✈️',
  Hotel: '🏨',
  Restaurant: '🍽️',
  Taxi: '🚕',
};

interface CategoryFilterProps {
  categories: ApiCategory[];
  selectedId: number | null;
  onChange: (categoryId: number | null) => void;
}

export function CategoryFilter({ categories, selectedId, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {categories.map((cat) => {
        const isActive = selectedId === cat.categoryId;
        const isLocked = cat.categoryLocked;
        const emoji = CATEGORY_EMOJI[cat.categoryName] ?? '🗣️';

        return (
          <button
            key={cat.categoryId}
            disabled={isLocked}
            onClick={() => !isLocked && onChange(isActive ? null : cat.categoryId)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isLocked
                ? 'bg-card text-muted-foreground opacity-40 cursor-default'
                : isActive
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground'
            }`}
          >
            <span>{emoji}</span>
            <span>{cat.categoryName}</span>
            {isLocked && <span className="text-xs">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
