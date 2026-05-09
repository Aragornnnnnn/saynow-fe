// 뱁새 대사 TTS 재생 훅 — 네이티브 앱으로 postMessage, 브라우저 개발 환경은 Web Speech API fallback
'use client';

export function useTts() {
  function speak(text: string, ttsUrl: string | null) {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'PLAY_TTS', text, url: ttsUrl ?? null })
      );
      return;
    }
    // 브라우저 개발 환경 fallback
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  return { speak };
}
