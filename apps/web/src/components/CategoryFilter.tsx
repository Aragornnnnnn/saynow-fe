// 시나리오 선택 페이지 상단 카테고리 필터 칩
'use client';

import { Category, CATEGORIES } from '@/lib/scenarios';

interface CategoryFilterProps {
  selected: Category;
  onChange: (category: Category) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selected === category
              ? 'bg-primary text-white'
              : 'bg-card text-muted-foreground'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
