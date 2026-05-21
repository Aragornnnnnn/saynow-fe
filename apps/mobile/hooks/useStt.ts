// expo-speech-recognition 기반 STT 시작/중지 및 권한 처리 훅
import { useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface UseSttOptions {
  onPartial: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onDenied: () => void;
}

export function useStt({ onPartial, onFinal, onDenied }: UseSttOptions) {
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
      onDenied();
    }
  });

  const start = useCallback(async () => {
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

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
  }, [onDenied]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { start, stop };
}
