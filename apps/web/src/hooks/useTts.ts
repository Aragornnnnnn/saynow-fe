'use client';

import { useCallback } from 'react';
import { playNativeTts } from '@/bridge/commands';

interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export function useTts() {
  const speak = useCallback((text: string, ttsUrl: string | null, options?: SpeakOptions) => {
    if (playNativeTts(text, ttsUrl ?? null)) {
      options?.onStart?.();
      return;
    }

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => options?.onEnd?.();
    utterance.onerror = () => options?.onEnd?.();
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
