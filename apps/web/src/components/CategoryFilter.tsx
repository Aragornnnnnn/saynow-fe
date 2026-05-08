// 시나리오 선택 페이지 상단 카테고리 필터 칩
'use client';

import { ApiCategory } from '@/lib/api';

interface CategoryFilterProps {
  categories: ApiCategory[];
  selectedId: string | null;
  onChange: (categoryId: string) => void;
}

export function CategoryFilter({ categories, selectedId, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {categories.map((cat) => (
        <button
          key={cat.categoryId}
          onClick={() => onChange(cat.categoryId)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selectedId === cat.categoryId
              ? 'bg-primary text-white'
              : 'bg-card text-muted-foreground'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
