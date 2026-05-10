import { request } from './client';

export interface ApiSessionStarted {
  sessionId: string;
  scenarioId: string;
  status: string;
  babsaeText: string;
  babsaeTtsUrl: string | null;
  followUpCount: number;
  maxFollowUpCount: number;
  startedAt: string;
}

export interface ApiTurnResult {
  sessionId: string;
  turnId: number;
  turnIndex: number;
  transcript: string;
  sttConfidence: number;
  status: string;
  babsaeText: string;
  babsaeTtsUrl: string | null;
  followUpCount: number;
  maxFollowUpCount: number;
  feedbackAvailable: boolean;
}

export function startSession(scenarioId: string): Promise<ApiSessionStarted> {
  return request('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({ scenarioId }),
  });
}

export function submitTurn(
  sessionId: string,
  audioBase64: string,
  speechStartedAfterMs: number,
  recordingDurationMs: number,
  mimeType = 'audio/x-m4a',
): Promise<ApiTurnResult> {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const audioBlob = new Blob([bytes], { type: mimeType });
  const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
  const requestBlob = new Blob(
    [JSON.stringify({ inputType: 'AUDIO', speechStartedAfterMs, recordingDurationMs })],
    { type: 'application/json' },
  );

  const formData = new FormData();
  formData.append('audio', audioBlob, `audio.${ext}`);
  formData.append('request', requestBlob, 'request.json');

  return request(`/api/v1/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: {},
    body: formData,
  });
}

export function recordMicReady(sessionId: string, latencyMs: number): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/micReady`, {
    method: 'PUT',
    body: JSON.stringify({ latencyMs }),
  });
}

export function exitSession(sessionId: string): Promise<void> {
  return request(`/api/v1/sessions/${sessionId}/exit`, { method: 'POST' });
}
