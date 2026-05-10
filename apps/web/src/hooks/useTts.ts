'use client';

import { useCallback } from 'react';
import { playNativeTts } from '@/bridge/commands';

export function useTts() {
  const speak = useCallback((text: string, ttsUrl: string | null) => {
    if (playNativeTts(text, ttsUrl ?? null)) return;

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
