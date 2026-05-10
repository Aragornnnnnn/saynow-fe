'use client';

import { useCallback, useEffect, useRef } from 'react';
import { requestNativeMicPermission, startNativeRecording, stopNativeRecording } from '@/bridge/commands';
import { useBridgeEvent } from '@/bridge/useBridgeEvent';
import { webBridge } from '@/bridge/webBridge';
import { useAppStore } from '@/store/appStore';

export function useRecordingBridge(
  onRecordingDone: (base64: string, mimeType?: string) => void,
  onPermissionDenied?: () => void,
  onPermissionGranted?: () => void,
) {
  const setMicPermission = useAppStore((s) => s.setMicPermission);
  const onRecordingDoneRef = useRef(onRecordingDone);
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  const onPermissionGrantedRef = useRef(onPermissionGranted);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webMimeTypeRef = useRef('audio/webm');

  useEffect(() => { onRecordingDoneRef.current = onRecordingDone; }, [onRecordingDone]);
  useEffect(() => { onPermissionDeniedRef.current = onPermissionDenied; }, [onPermissionDenied]);
  useEffect(() => { onPermissionGrantedRef.current = onPermissionGranted; }, [onPermissionGranted]);

  useBridgeEvent('RECORDING_DONE', (message) => {
    onRecordingDoneRef.current(message.base64, message.mimeType);
  });

  useBridgeEvent('MIC_PERMISSION_DENIED', () => {
    onPermissionDeniedRef.current?.();
  });

  useBridgeEvent('MIC_PERMISSION_STATUS', (message) => {
    setMicPermission(message.granted ? 'granted' : 'denied');
    if (message.granted) onPermissionGrantedRef.current?.();
    else onPermissionDeniedRef.current?.();
  });

  const startBrowserRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: webMimeTypeRef.current });
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        mediaRecorder.start();
        setMicPermission('granted');
        onPermissionGrantedRef.current?.();
      })
      .catch(() => {
        setMicPermission('denied');
        onPermissionDeniedRef.current?.();
      });
  }, [setMicPermission]);

  const startRecording = useCallback(() => {
    if (startNativeRecording()) return;
    startBrowserRecording();
  }, [startBrowserRecording]);

  const stopRecording = useCallback(() => {
    if (stopNativeRecording()) return;

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        onRecordingDoneRef.current(base64, webMimeTypeRef.current);
      };
      reader.readAsDataURL(blob);
    };
    mediaRecorder.stop();
  }, []);

  const requestMicPermission = useCallback(() => {
    if (requestNativeMicPermission()) return;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        setMicPermission('granted');
        onPermissionGrantedRef.current?.();
      })
      .catch(() => {
        setMicPermission('denied');
        onPermissionDeniedRef.current?.();
      });
  }, [setMicPermission]);

  return {
    isNative: webBridge.isAvailable(),
    startRecording,
    stopRecording,
    requestMicPermission,
  };
}
