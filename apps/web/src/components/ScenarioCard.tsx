// 시나리오 선택 페이지의 개별 카드 컴포넌트
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ApiScenarioSummary } from '@/lib/api';
import { SCENARIO_EMOJI } from '@/lib/scenarios';

interface ScenarioCardProps {
  scenario: ApiScenarioSummary;
  onClick: (scenario: ApiScenarioSummary) => void;
}

export function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={() => onClick(scenario)}
      onTouchStart={() => setPressed(true)}
      onTouchMove={() => setPressed(false)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      className={`flex flex-col gap-2 rounded-2xl p-4 text-left shadow-sm transition-colors duration-100 ${pressed ? 'bg-[#F0F0EE]' : 'bg-card'}`}
    >
      <div className="w-10 h-10 flex items-center justify-center">
        {scenario.thumbnailUrl ? (
          <Image src={scenario.thumbnailUrl} alt={scenario.title} width={40} height={40} className="object-cover rounded-xl" />
        ) : (
          <span className="tossface text-2xl">{SCENARIO_EMOJI[scenario.scenarioId] ?? '🗣️'}</span>
        )}
      </div>
      <div className="flex flex-col gap-1 min-h-10 justify-start">
        <span className="tossface text-sm font-semibold text-foreground leading-snug line-clamp-2">{scenario.title}</span>
      </div>
      <DifficultyBadge difficulty={scenario.difficulty} />
    </button>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: ApiScenarioSummary['difficulty'] }) {
  const isEasy = difficulty === 'EASY';
  return (
    <span
      className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${
        isEasy ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
      }`}
    >
      {isEasy ? '쉬움' : '어려움'}
    </span>
  );
}
