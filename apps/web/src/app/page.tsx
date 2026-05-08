// 시나리오 선택 페이지
'use client';

import { useEffect, useState } from 'react';
import { getCategories, getScenariosByCategory, ApiCategory, ApiScenarioSummary } from '@/lib/api';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ScenarioCard } from '@/components/ScenarioCard';
import { ScenarioModal } from '@/components/ScenarioModal';

export default function Home() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [scenarios, setScenarios] = useState<ApiScenarioSummary[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ApiScenarioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then((data) => {
      setCategories(data.categories);
      if (data.categories.length > 0) {
        setSelectedCategoryId(data.categories[0].categoryId);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    setLoading(true);
    getScenariosByCategory(selectedCategoryId).then((data) => {
      setScenarios(data.scenarios);
      setLoading(false);
    });
  }, [selectedCategoryId]);

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

  return (
    <main className="flex flex-col h-dvh bg-background">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">시나리오 선택</h1>
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategoryId}
          onChange={setSelectedCategoryId}
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 overscroll-y-contain">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.scenarioId}
                scenario={scenario}
                onClick={setSelectedScenario}
              />
            ))}
          </div>
        )}
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
