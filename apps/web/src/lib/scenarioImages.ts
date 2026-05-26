// 시나리오 ID별 배경 이미지 경로를 반환하는 유틸

type ScenarioImageType = 'play' | 'success' | 'fail';

export function getScenarioImage(scenarioId: number, type: ScenarioImageType): string {
  return `/images/scenarios/scenario-${scenarioId}-${type}.webp`;
}
