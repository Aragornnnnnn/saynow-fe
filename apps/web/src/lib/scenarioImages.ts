// 시나리오 ID별 배경 이미지 경로를 반환하는 유틸

type ScenarioImageType = 'play' | 'success' | 'fail';

export function getScenarioImage(scenarioId: number, type: ScenarioImageType): string {
  const group = scenarioId <= 2 ? '1-2' : '3';
  return `/images/scenarios/scenario-${group}-${type}.png`;
}
