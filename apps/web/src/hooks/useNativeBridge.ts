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
  onPermissionGranted?: () => void,
) {
  const onRecordingDoneRef = useRef(onRecordingDone);
  onRecordingDoneRef.current = onRecordingDone;
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  onPermissionDeniedRef.current = onPermissionDenied;
  const onPermissionGrantedRef = useRef(onPermissionGranted);
  onPermissionGrantedRef.current = onPermissionGranted;
  const setMicPermission = useAppStore((s) => s.setMicPermission);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (process.env.NODE_ENV === 'development') console.log('[Bridge] received:', data);
        if (data.type === 'RECORDING_DONE') onRecordingDoneRef.current(data.uri);
        if (data.type === 'MIC_PERMISSION_DENIED') onPermissionDeniedRef.current?.();
        if (data.type === 'MIC_PERMISSION_STATUS') {
          setMicPermission(data.granted ? 'granted' : 'denied');
          if (data.granted) onPermissionGrantedRef.current?.();
          else onPermissionDeniedRef.current?.();
        }
      } catch {}
    };
    // Android WebView는 document, iOS WebView는 window로 메시지가 옴
    window.addEventListener('message', handler);
    document.addEventListener('message', handler as EventListener);
    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('message', handler as EventListener);
    };
  }, []);

  const isNative = typeof window !== 'undefined' && !!window.ReactNativeWebView;

  function startRecording() {
    if (process.env.NODE_ENV === 'development') console.log('[Bridge] send: START_RECORDING');
    window.ReactNativeWebView?.postMessage('START_RECORDING');
  }

  function stopRecording() {
    if (process.env.NODE_ENV === 'development') console.log('[Bridge] send: STOP_RECORDING');
    window.ReactNativeWebView?.postMessage('STOP_RECORDING');
  }

  function requestMicPermission() {
    if (process.env.NODE_ENV === 'development') console.log('[Bridge] send: REQUEST_MIC_PERMISSION');
    window.ReactNativeWebView?.postMessage('REQUEST_MIC_PERMISSION');
  }

  return { isNative, startRecording, stopRecording, requestMicPermission };
}
