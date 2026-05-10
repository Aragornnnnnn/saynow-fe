// 마이크 녹음 시작/중지 및 권한 요청을 담당하는 훅
import { Audio } from 'expo-av';
import { Linking } from 'react-native';
import { useCallback, useRef } from 'react';

export function useRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);

  const start = useCallback(async () => {
    const { granted, canAskAgain } = await Audio.getPermissionsAsync();
    if (!granted) {
      if (canAskAgain) {
        const result = await Audio.requestPermissionsAsync();
        if (!result.granted) return false;
      } else {
        return false;
      }
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
    return true;
  }, []);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return null;
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    if (!uri) return null;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      if (__DEV__) console.error('[Recorder] error:', e);
      return null;
    }
  }, []);

  return { start, stop, openSettings: Linking.openSettings };
}
