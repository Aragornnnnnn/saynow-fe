// 네이티브 WebView와 postMessage로 통신하는 브릿지 훅 (웹 환경에서는 MediaRecorder fallback 사용)
'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

export function useNativeBridge(
  onRecordingDone: (base64: string, mimeType?: string) => void,
  onPermissionDenied?: () => void,
  onPermissionGranted?: () => void,
) {
  const onRecordingDoneRef = useRef(onRecordingDone);
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  const onPermissionGrantedRef = useRef(onPermissionGranted);
  useEffect(() => { onRecordingDoneRef.current = onRecordingDone; });
  useEffect(() => { onPermissionDeniedRef.current = onPermissionDenied; });
  useEffect(() => { onPermissionGrantedRef.current = onPermissionGranted; });
  const setMicPermission = useAppStore((s) => s.setMicPermission);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webMimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (process.env.NODE_ENV === 'development') window.ReactNativeWebView?.postMessage(JSON.stringify({ type: '__DEBUG__', raw: typeof e.data, len: String(e.data)?.length, preview: String(e.data).slice(0, 100) }));
      try {
        const data = JSON.parse(e.data);
        if (process.env.NODE_ENV === 'development') console.log('[Bridge] received:', data);
        if (data.type === 'RECORDING_DONE') {
          if (process.env.NODE_ENV === 'development') console.log('[Bridge] RECORDING_DONE base64 length:', data.base64?.length);
          onRecordingDoneRef.current(data.base64);
        }
        if (data.type === 'MIC_PERMISSION_DENIED') onPermissionDeniedRef.current?.();
        if (data.type === 'MIC_PERMISSION_STATUS') {
          setMicPermission(data.granted ? 'granted' : 'denied');
          if (data.granted) onPermissionGrantedRef.current?.();
          else onPermissionDeniedRef.current?.();
        }
      } catch (err) {
        console.error('[Bridge] parse error:', err, 'raw:', e.data);
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type: '__DEBUG__', parseError: String(err), preview: String(e.data).slice(0, 50) }));
      }
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
    if (isNative) {
      if (process.env.NODE_ENV === 'development') console.log('[Bridge] send: START_RECORDING');
      window.ReactNativeWebView!.postMessage('START_RECORDING');
      return;
    }
    // 웹 fallback — MediaRecorder
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        chunksRef.current = [];
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        webMimeTypeRef.current = 'audio/webm';
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start();
        setMicPermission('granted');
        onPermissionGrantedRef.current?.();
      })
      .catch(() => {
        setMicPermission('denied');
        onPermissionDeniedRef.current?.();
      });
  }

  function stopRecording() {
    if (isNative) {
      if (process.env.NODE_ENV === 'development') console.log('[Bridge] send: STOP_RECORDING');
      window.ReactNativeWebView!.postMessage('STOP_RECORDING');
      return;
    }
    // 웹 fallback — MediaRecorder 종료 후 base64로 변환
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      mr.stream.getTracks().forEach((t) => t.stop());
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        onRecordingDoneRef.current(base64, webMimeTypeRef.current);
      };
      reader.readAsDataURL(blob);
    };
    mr.stop();
  }

  function requestMicPermission() {
    if (isNative) {
      if (process.env.NODE_ENV === 'development') console.log('[Bridge] send: REQUEST_MIC_PERMISSION');
      window.ReactNativeWebView!.postMessage('REQUEST_MIC_PERMISSION');
      return;
    }
    // 웹에서는 getUserMedia로 권한 확인
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setMicPermission('granted');
        onPermissionGrantedRef.current?.();
      })
      .catch(() => {
        setMicPermission('denied');
        onPermissionDeniedRef.current?.();
      });
  }

  return { isNative, startRecording, stopRecording, requestMicPermission };
}
