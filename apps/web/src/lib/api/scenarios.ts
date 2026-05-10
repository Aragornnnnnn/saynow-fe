import { request } from './client';

export interface ApiCategory {
  categoryId: string;
  name: string;
}

export interface ApiScenarioSummary {
  scenarioId: string;
  categoryId: string;
  title: string;
  difficulty: string;
  situationDescription: string;
  successGoal: string;
  thumbnailUrl: string | null;
}

export function getCategories(): Promise<{ categories: ApiCategory[] }> {
  return request('/api/v1/categories');
}

export function getScenarios(): Promise<{ scenarios: ApiScenarioSummary[] }> {
  return request('/api/v1/scenarios');
}
