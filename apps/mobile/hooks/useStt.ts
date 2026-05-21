// expo-speech-recognition 기반 STT 시작/중지 및 권한 처리 훅
import { useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface UseSttOptions {
  onPartial: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onDenied: () => void;
  onError: () => void;
}

export function useStt({ onPartial, onFinal, onDenied, onError }: UseSttOptions) {
  const isRunningRef = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      onFinal(transcript);
    } else {
      onPartial(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'not-allowed') {
      isRunningRef.current = false;
      onDenied();
      return;
    }
    // 그 외 에러는 onError로 알려서 stopping 상태 탈출
    if (isRunningRef.current) {
      isRunningRef.current = false;
      onError();
    }
  });

  const start = useCallback(async () => {
    if (isRunningRef.current) return;

    const { granted, canAskAgain } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!granted) {
      if (canAskAgain) {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          onDenied();
          return;
        }
      } else {
        onDenied();
        return;
      }
    }

    isRunningRef.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      androidIntentOptions: {
        // Android silence detection을 30초로 늘려 자동 종료 방지
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 30000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 30000,
      },
    });
  }, [onDenied]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { start, stop };
}
