// 네이티브 WebView와 postMessage로 통신하는 브릿지 훅
'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

export function useNativeBridge(
  onRecordingDone: (uri: string) => void,
  onPermissionDenied?: () => void,
) {
  const onRecordingDoneRef = useRef(onRecordingDone);
  onRecordingDoneRef.current = onRecordingDone;
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  onPermissionDeniedRef.current = onPermissionDenied;
  const setMicPermission = useAppStore((s) => s.setMicPermission);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'RECORDING_DONE') onRecordingDoneRef.current(data.uri);
        if (data.type === 'MIC_PERMISSION_DENIED') onPermissionDeniedRef.current?.();
        if (data.type === 'MIC_PERMISSION_STATUS') setMicPermission(data.granted ? 'granted' : 'denied');
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  const isNative = typeof window !== 'undefined' && !!window.ReactNativeWebView;

  function startRecording() {
    window.ReactNativeWebView?.postMessage('START_RECORDING');
  }

  function stopRecording() {
    window.ReactNativeWebView?.postMessage('STOP_RECORDING');
  }

  function requestMicPermission() {
    window.ReactNativeWebView?.postMessage('REQUEST_MIC_PERMISSION');
  }

  return { isNative, startRecording, stopRecording, requestMicPermission };
}
