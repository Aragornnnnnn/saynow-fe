// 마이크 녹음 시작/중지 및 권한 요청을 담당하는 훅
import { Audio } from 'expo-av';
import { Linking } from 'react-native';
import { useRef } from 'react';

export function useRecorder(
  onRecorded: (base64: string) => void,
  onPermissionDenied: () => void,
) {
  const recordingRef = useRef<Audio.Recording | null>(null);

  async function start() {
    const { granted, canAskAgain } = await Audio.getPermissionsAsync();
    if (!granted) {
      if (canAskAgain) {
        const result = await Audio.requestPermissionsAsync();
        if (!result.granted) { onPermissionDenied(); return; }
      } else {
        onPermissionDenied();
        return;
      }
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
  }

  async function stop() {
    if (!recordingRef.current) return;
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    if (!uri) return;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      onRecorded(base64);
    } catch (e) {
      if (__DEV__) console.error('[Recorder] error:', e);
    }
  }

  return { start, stop, openSettings: Linking.openSettings };
}
