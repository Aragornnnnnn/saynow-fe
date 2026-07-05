// Deepgram WebSocket 기반 실시간 STT 훅 — 실패 시 expo-speech-recognition으로 폴백
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioStream } from 'expo-audio';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

// 침묵 감지 시간(ms) — 이만큼 말이 멈추면 턴 종료. 웹이 PREPARE_STT로 덮어쓸 수 있고, 없으면 기본값 사용
const DEFAULT_ENDPOINTING_MS = 2000;
const MIN_ENDPOINTING_MS = 1000;
const MAX_ENDPOINTING_MS = 5000;

function clampEndpointingMs(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_ENDPOINTING_MS;
  return Math.min(MAX_ENDPOINTING_MS, Math.max(MIN_ENDPOINTING_MS, Math.round(value)));
}

function buildDeepgramParams(endpointingMs: number): string {
  return new URLSearchParams({
    model: 'nova-3',
    language: 'en-US',
    smart_format: 'true',
    interim_results: 'true',
    endpointing: String(endpointingMs),
    utterance_end_ms: String(endpointingMs),
    vad_events: 'true',
    encoding: 'linear16',
    channels: '1',
    sample_rate: '16000',
  }).toString();
}

interface UseSttOptions {
  onPartial: (transcript: string) => void;
  onFinal: (transcript: string, engine: 'deepgram' | 'native') => void;
  onDenied: () => void;
  onError: () => void;
}

interface StartOptions {
  contextualStrings?: string[];
  languageModel?: 'web_search' | 'free_form';
}

function log(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[STT] ${msg}`, data);
  } else {
    console.log(`[STT] ${msg}`);
  }
}

export function useStt({ onPartial, onFinal, onDenied, onError }: UseSttOptions) {
  const isRecordingRef = useRef(false);
  const connectingPromiseRef = useRef<Promise<boolean> | null>(null);
  const submittedRef = useRef(false);
  const engineRef = useRef<'deepgram' | 'native'>('deepgram');
  const wsRef = useRef<WebSocket | null>(null);
  const finalTranscriptRef = useRef('');
  const endpointingMsRef = useRef(DEFAULT_ENDPOINTING_MS);

  // 마이크 PCM 캡처 — int16 네이티브 인코딩이라 Deepgram linear16에 ArrayBuffer 그대로 전송
  const { stream: audioStream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      if (!isRecordingRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        log('onBuffer — WS 없음, 스킵');
        return;
      }
      // Deepgram URL이 sample_rate=16000 고정이라 하드웨어가 다른 값을 주면 인식이 깨짐
      if (buffer.sampleRate !== 16000) {
        log('경고: 요청과 다른 sampleRate', buffer.sampleRate);
      }
      ws.send(buffer.data);
    },
  });
  const audioStreamRef = useRef(audioStream);
  audioStreamRef.current = audioStream;

  // ── 네이티브 폴백 ────────────────────────────────────────────────────────

  useSpeechRecognitionEvent('result', (event) => {
    if (engineRef.current !== 'native') return;
    const transcript = event.results[0]?.transcript ?? '';
    log('네이티브 결과', { transcript, isFinal: event.isFinal });
    if (event.isFinal) {
      onFinal(transcript, 'native');
    } else {
      onPartial(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (engineRef.current !== 'native') return;
    log('네이티브 에러', event.error);
    if (event.error === 'not-allowed') {
      isRecordingRef.current = false;
      onDenied();
      return;
    }
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      onError();
    }
  });

  async function startNativeFallback(options: StartOptions) {
    log('네이티브 폴백 시작');
    engineRef.current = 'native';
    const { granted, canAskAgain } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!granted) {
      if (canAskAgain) {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) { onDenied(); return; }
      } else {
        onDenied(); return;
      }
    }
    isRecordingRef.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      ...(options.contextualStrings?.length ? { contextualStrings: options.contextualStrings } : {}),
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: options.languageModel ?? 'free_form',
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 30000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 30000,
      },
    });
  }

  // ── Deepgram WS 연결 ────────────────────────────────────────────────────

  const connectDeepgram = useCallback((): Promise<boolean> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('이미 연결됨 — 재사용');
      return Promise.resolve(true);
    }
    if (connectingPromiseRef.current) {
      log('연결 중 — 기존 Promise 대기');
      return connectingPromiseRef.current;
    }

    const promise = (async (): Promise<boolean> => {
      let token: string;
      try {
        log('토큰 fetch 시작');
        const res = await fetch(`${WEB_URL}/api/stt/token`, { method: 'POST' });
        if (!res.ok) throw new Error(`token fetch failed: ${res.status}`);
        const json = await res.json() as { token: string };
        token = json.token;
        log('토큰 fetch 성공');
      } catch (e) {
        log('토큰 fetch 실패', e);
        connectingPromiseRef.current = null;
        return false;
      }

      return new Promise((resolve) => {
        log('Deepgram WS 연결 시도');
        const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${buildDeepgramParams(endpointingMsRef.current)}`, ['bearer', token]);
        wsRef.current = ws;

        ws.onopen = () => {
          log('Deepgram WS 연결 성공');
          connectingPromiseRef.current = null;
          engineRef.current = 'deepgram';
          resolve(true);
        };

        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data as string) as {
            type: string;
            channel?: { alternatives: { transcript: string }[] };
            is_final?: boolean;
            speech_final?: boolean;
          };

          // UtteranceEnd — 침묵 감지, 텍스트 있으면 바로 종료
          if (msg.type === 'UtteranceEnd') {
            log('UtteranceEnd 수신', { accumulated: finalTranscriptRef.current, submitted: submittedRef.current });
            if (!submittedRef.current && finalTranscriptRef.current) {
              finishTurn(finalTranscriptRef.current);
            }
            return;
          }

          if (msg.type !== 'Results' || !msg.channel) {
            log('WS 메시지 (Results 아님)', msg.type);
            return;
          }

          const text = msg.channel.alternatives[0]?.transcript ?? '';
          log('Results 수신', {
            text,
            is_final: msg.is_final,
            speech_final: msg.speech_final,
            isRecording: isRecordingRef.current,
            submitted: submittedRef.current,
            accumulated: finalTranscriptRef.current,
          });

          if (msg.is_final && text) {
            finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + text).trim();
            log('누적 transcript 갱신', finalTranscriptRef.current);
          }

          if (msg.speech_final) {
            if (submittedRef.current) {
              log('speech_final — 이미 제출됨, 무시');
              return;
            }
            finishTurn(finalTranscriptRef.current);
          } else {
            if (!isRecordingRef.current) return;
            const preview = msg.is_final
              ? finalTranscriptRef.current
              : (finalTranscriptRef.current + ' ' + text).trim();
            if (preview) {
              log('onPartial 호출', preview);
              onPartial(preview);
            }
          }
        };

        ws.onerror = (e) => {
          log('WS 에러', e);
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            connectingPromiseRef.current = null;
            wsRef.current = null;
            resolve(false);
          }
        };

        ws.onclose = (e) => {
          log('WS 연결 닫힘', { code: e.code, reason: e.reason });
          connectingPromiseRef.current = null;
          wsRef.current = null;
          if (isRecordingRef.current) {
            log('녹음 중 WS 종료 → onError');
            isRecordingRef.current = false;
            audioStreamRef.current.stop();
            onError();
          }
        };
      });
    })();

    connectingPromiseRef.current = promise;
    return promise;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 턴 종료 — 마이크 스트림 멈추고 onFinal 호출, 즉시 다음 턴용 WS 미리 연결
  function finishTurn(transcript: string) {
    log('finishTurn', transcript);
    submittedRef.current = true;
    isRecordingRef.current = false;
    audioStreamRef.current.stop();

    // WS 닫기
    const ws = wsRef.current;
    wsRef.current = null;
    ws?.close();

    // 즉시 다음 턴용 WS 미리 연결 (AI 응답 + TTS 재생 시간 동안 완료됨)
    connectDeepgram();

    if (transcript) onFinal(transcript, 'deepgram');
  }

  // ── 언마운트 정리 ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      log('훅 언마운트 — 완전 종료');
      isRecordingRef.current = false;
      audioStreamRef.current.stop();
      wsRef.current?.close();
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 공개 API ─────────────────────────────────────────────────────────────

  // 대화 페이지 진입 시 웹에서 호출 — endpointing 값을 받아 WS 미리 연결
  // 값은 연결 URL에 박히므로 반드시 선접속 전(여기)에서 정해져야 함
  // iOS는 녹음이 켜지면 오디오 세션이 PlayAndRecord로 바뀌며 소리가 수화기로 빠진다.
  // 스피커 출력 + 무음 스위치 무시로 세션을 잡아 TTS가 들리게 한다. (Android은 기본 동작 유지)
  function ensureIosAudioMode() {
    if (Platform.OS !== 'ios') return;
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }

  const prepare = useCallback((options: { endpointingMs?: number } = {}) => {
    ensureIosAudioMode();
    endpointingMsRef.current = clampEndpointingMs(options.endpointingMs);
    log('prepare() — Deepgram 미리 연결', { endpointingMs: endpointingMsRef.current });
    connectDeepgram();
  }, [connectDeepgram]);

  const start = useCallback(async (options: StartOptions = {}) => {
    log('start() 호출', {
      isRecording: isRecordingRef.current,
      isConnecting: !!connectingPromiseRef.current,
      wsState: wsRef.current?.readyState,
    });

    if (isRecordingRef.current) {
      log('이미 녹음 중 — 무시');
      return;
    }
    // 온보딩처럼 prepare 없이 start만 호출하는 경로도 세션 설정을 타도록 보강
    ensureIosAudioMode();
    isRecordingRef.current = true;

    // 마이크 권한 확인
    const { granted, canAskAgain } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!granted) {
      if (canAskAgain) {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          log('마이크 권한 거부');
          isRecordingRef.current = false;
          onDenied();
          return;
        }
      } else {
        log('마이크 권한 영구 거부');
        isRecordingRef.current = false;
        onDenied();
        return;
      }
    }

    // WS가 열려있으면 즉시, 아니면 연결 대기
    const wsReady = wsRef.current?.readyState === WebSocket.OPEN;
    log('WS 상태 확인', { wsReady, readyState: wsRef.current?.readyState });

    if (!wsReady) {
      const connected = await connectDeepgram();
      if (!connected) {
        log('Deepgram 연결 실패 → 네이티브 폴백');
        isRecordingRef.current = false;
        await startNativeFallback(options);
        return;
      }
    }

    // 이번 턴 초기화
    finalTranscriptRef.current = '';
    submittedRef.current = false;
    engineRef.current = 'deepgram';

    log('audioStream.start()');
    try {
      await audioStreamRef.current.start();
    } catch (e) {
      // 다른 앱이 마이크를 점유 중이거나 초기화 실패
      log('audioStream.start() 실패', e);
      isRecordingRef.current = false;
      onError();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectDeepgram]);

  const stop = useCallback(() => {
    log('stop() 호출', {
      isRecording: isRecordingRef.current,
      engine: engineRef.current,
      wsState: wsRef.current?.readyState,
      accumulated: finalTranscriptRef.current,
    });

    if (!isRecordingRef.current) {
      log('녹음 중 아님 — 무시');
      return;
    }
    isRecordingRef.current = false;

    if (engineRef.current === 'deepgram') {
      audioStreamRef.current.stop();
      // Finalize 전송 — 버퍼 남은 오디오 처리 후 speech_final or UtteranceEnd 수신
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        log('Finalize 전송');
        wsRef.current.send(JSON.stringify({ type: 'Finalize' }));
      } else {
        log('WS 없음 — Finalize 전송 불가');
      }
    } else {
      ExpoSpeechRecognitionModule.stop();
    }
  }, []);

  return { prepare, start, stop };
}
