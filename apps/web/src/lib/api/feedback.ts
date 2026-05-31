// 세션 완료 및 피드백 생성 API
import { request, ensureAccessToken } from './client';

export interface ApiTurnFeedback {
  turnId: number;
  sequence: number;
  originalQuestion: string;
  translatedQuestion: string;
  userUtterance: string;
  feedbackRequired: boolean;
  nativeUnderstanding: string | null;
  nativeLanguageInterpretation: string | null;
  betterExpression: string | null;
}

export interface ApiFeedback {
  sessionId: number;
  cleared: boolean;
  comprehensionScore: number;
  feedbackSummary: string;
  remainingHearts: number;
  turnFeedbacks: ApiTurnFeedback[];
}

export function createFeedback(sessionId: number): Promise<ApiFeedback> {
  return request(`/api/v1/sessions/${sessionId}/feedback`, {
    method: 'POST',
  });
}

export function submitNps(sessionId: number, score: number, lowScoreReason?: string): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/nps`, {
    method: 'POST',
    body: JSON.stringify({
      score,
      lowScoreReason: score <= 2 ? (lowScoreReason ?? null) : null,
    }),
  });
}

// SSE 이벤트 타입 — 백엔드가 헤더/턴을 별도 이벤트로 스트리밍
export type FeedbackSseEvent =
  | { type: 'header'; sessionId: number; cleared: boolean; comprehensionScore: number; feedbackSummary: string; remainingHearts: number }
  | { type: 'turn'; turn: ApiTurnFeedback }
  | { type: 'done' };

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/store/authStore').useAuthStore.getState().accessToken ?? null;
}

export async function* streamFeedback(sessionId: number): AsyncGenerator<FeedbackSseEvent> {
  let token = getAccessToken();
  if (!token) token = await ensureAccessToken();
  if (!token) throw new Error('인증이 필요해요.');

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`/api/v1/sessions/${sessionId}/feedback/stream`, { method: 'POST', headers });

  if (!response.ok || !response.body) {
    throw new Error(`SSE 연결 실패 (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE는 빈 줄(\n\n)로 이벤트 구분
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const line = raw.trim();
      if (!line) continue;

      // "data: ..." 형식 파싱
      const dataLine = line.startsWith('data:') ? line.slice(5).trim() : line;
      if (dataLine === '[DONE]') {
        yield { type: 'done' };
        return;
      }

      try {
        const parsed = JSON.parse(dataLine) as FeedbackSseEvent;
        yield parsed;
        if (parsed.type === 'done') return;
      } catch {
        // 파싱 불가 라인은 무시 (ping, comment 등)
      }
    }
  }
}
