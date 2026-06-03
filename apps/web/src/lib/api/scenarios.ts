// 시나리오 목록 조회 API — 카테고리/잠금/클리어 상태 포함
import { request } from './client';

export interface ApiScenario {
  scenarioId: number;
  displayOrder: number;
  scenarioTitle: string;
  briefing: string;
  conversationGoal: string;
  completed: boolean;
  locked: boolean;
  lockReason: string | null;
  firstQuestionPreview: {
    questionId: number;
    aiQuestion: string;
    translatedQuestion: string;
  } | null;
  scenarioEmoji?: string | null;
}

export interface ApiCategory {
  categoryId: number;
  categoryName: string;
  categoryLocked: boolean;
  categoryLockReason: string | null;
  scenarios: ApiScenario[];
}

export interface ApiScenariosResponse {
  categories: ApiCategory[];
}

export function getScenarios(): Promise<ApiScenariosResponse> {
  return request('/api/v1/scenarios');
}
