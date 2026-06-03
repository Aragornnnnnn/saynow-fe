// 시나리오 선택 시 브리핑에 필요한 정보를 임시 보관하는 store
import { create } from 'zustand';

export interface ScenarioInfo {
  scenarioId: number;
  scenarioTitle: string;
  briefing: string;
  conversationGoal: string;
  scenarioEmoji: string | null;
}

interface ScenarioState {
  current: ScenarioInfo | null;
  setScenario: (info: ScenarioInfo) => void;
}

export const useScenarioStore = create<ScenarioState>()((set) => ({
  current: null,
  setScenario: (info) => set({ current: info }),
}));
