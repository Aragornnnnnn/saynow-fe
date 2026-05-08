// 시나리오 선택 페이지
'use client';

import { useState } from 'react';
import { Category, SCENARIOS, Scenario } from '@/lib/scenarios';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ScenarioCard } from '@/components/ScenarioCard';
import { ScenarioModal } from '@/components/ScenarioModal';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  const filtered =
    selectedCategory === '전체'
      ? SCENARIOS
      : SCENARIOS.filter((s) => s.category === selectedCategory);

  return (
    <main className="flex flex-col h-full bg-background">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">시나리오 선택</h1>
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
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
