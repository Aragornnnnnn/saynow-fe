// 시나리오 선택 페이지의 개별 카드 컴포넌트
import { Scenario } from '@/lib/scenarios';

interface ScenarioCardProps {
  scenario: Scenario;
  onClick: (scenario: Scenario) => void;
}

export function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  return (
    <button
      onClick={() => onClick(scenario)}
      className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-left shadow-sm active:scale-95 transition-transform duration-100"
    >
      <span className="text-3xl">{scenario.emoji}</span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-foreground leading-snug">{scenario.title}</span>
        <span className="text-xs text-muted-foreground">{scenario.category}</span>
      </div>
      <DifficultyBadge difficulty={scenario.difficulty} />
    </button>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Scenario['difficulty'] }) {
  const isEasy = difficulty === '쉬움';
  return (
    <span
      className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${
        isEasy
          ? 'bg-green-100 text-green-700'
          : 'bg-orange-100 text-orange-600'
      }`}
    >
      {difficulty}
    </span>
  );
}
