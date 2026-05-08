// 시나리오 선택 페이지
'use client';

import { useEffect, useState } from 'react';
// TODO: API 연동 시 SCENARIOS, CATEGORIES 제거하고 아래 API로 교체
// GET /api/v1/categories → 카테고리 목록
// GET /api/v1/categories/{categoryId}/scenarios → 카테고리별 시나리오 목록
// (또는 백엔드에 전체 시나리오 목록 API 추가 요청 후 GET /api/v1/scenarios 단일 호출)
import { Category, SCENARIOS, Scenario } from '@/lib/scenarios';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ScenarioCard } from '@/components/ScenarioCard';
import { ScenarioModal } from '@/components/ScenarioModal';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'BACK_PRESSED' && selectedScenario) {
        setSelectedScenario(null);
      }
    };
    window.addEventListener('message', handler);
    document.addEventListener('message', handler as EventListener);
    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('message', handler as EventListener);
    };
  }, [selectedScenario]);

  const filtered =
    selectedCategory === '전체'
      ? SCENARIOS
      : SCENARIOS.filter((s) => s.category === selectedCategory);

  return (
    <main className="flex flex-col h-dvh bg-background">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">시나리오 선택</h1>
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 overscroll-y-contain">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onClick={setSelectedScenario}
            />
          ))}
        </div>
      </div>

      {selectedScenario && (
        <ScenarioModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
        />
      )}
    </main>
  );
}
