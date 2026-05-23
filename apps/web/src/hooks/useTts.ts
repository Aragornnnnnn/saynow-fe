'use client';

import { useCallback, useEffect, useRef } from 'react';
import { playNativeTts } from '@/bridge/commands';
import { webBridge } from '@/bridge/webBridge';

interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export function useTts() {
  const onEndRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    return webBridge.subscribe((message) => {
      if (message.type === 'TTS_END') {
        onEndRef.current?.();
        onEndRef.current = undefined;
      }
    });
  }, []);

  const speak = useCallback((text: string, ttsUrl: string | null, options?: SpeakOptions) => {
    if (playNativeTts(text, ttsUrl ?? null)) {
      onEndRef.current = options?.onEnd;
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

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    onEndRef.current?.();
    onEndRef.current = undefined;
  }, []);

  return { speak, stop };
}
