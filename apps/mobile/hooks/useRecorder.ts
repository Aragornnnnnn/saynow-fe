// 마이크 녹음 시작/중지 및 권한 요청을 담당하는 훅
import { Audio } from 'expo-av';
import { useRef, useState } from 'react';

type RecorderState = 'idle' | 'recording';

export function useRecorder(onRecorded: (uri: string) => void) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [state, setState] = useState<RecorderState>('idle');

  async function start() {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
    setState('recording');
  }

  async function stop() {
    if (!recordingRef.current) return;
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    setState('idle');
    if (uri) onRecorded(uri);
  }

  return { state, start, stop };
}
