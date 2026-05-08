// 시나리오 선택 페이지 상단 카테고리 필터 칩
'use client';

import { ApiCategory } from '@/lib/api';

interface CategoryFilterProps {
  categories: ApiCategory[];
  selectedId: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryFilter({ categories, selectedId, onChange }: CategoryFilterProps) {
  const chips = [{ categoryId: null, name: '전체' }, ...categories.map((c) => ({ categoryId: c.categoryId as string | null, name: c.name }))];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {chips.map((chip) => (
        <button
          key={chip.categoryId ?? 'all'}
          onClick={() => onChange(chip.categoryId)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selectedId === chip.categoryId ? 'bg-primary text-white' : 'bg-card text-muted-foreground'
          }`}
        >
          {chip.name}
        </button>
      ))}
    </div>
  );
}
