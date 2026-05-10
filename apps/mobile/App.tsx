// 웹뷰 껍데기 앱 진입점
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useRecorder } from './hooks/useRecorder';

SplashScreen.preventAutoHideAsync();

const WEB_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000')
  : 'https://saynow-fe-web.vercel.app';

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [hasError, setHasError] = useState(false);

  const handleRecorded = useCallback((base64: string) => {
    if (__DEV__) console.log('[App] handleRecorded base64 length:', base64?.length);
    if (__DEV__) console.log('[App] webviewRef.current:', !!webviewRef.current);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'RECORDING_DONE', base64 }));
    if (__DEV__) console.log('[App] RECORDING_DONE posted');
  }, []);

  const handlePermissionDenied = useCallback(() => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'MIC_PERMISSION_DENIED' }));
  }, []);

  const { start, stop, openSettings } = useRecorder(handleRecorded, handlePermissionDenied);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      webviewRef.current?.postMessage('BACK_PRESSED');
      return true;
    });
    return () => subscription.remove();
  }, []);

  async function handleLoadEnd() {
    SplashScreen.hideAsync();
  }

  function handleError() {
    SplashScreen.hideAsync();
    setHasError(true);
  }

  function handleRetry() {
    setHasError(false);
    webviewRef.current?.reload();
  }

  async function handleMessage(e: WebViewMessageEvent) {
    const raw = e.nativeEvent.data;
    let data: { type?: string; url?: string; text?: string; provider?: string; nonce?: string } | null = null;
    try { data = JSON.parse(raw); } catch {}

    const type = data?.type ?? raw;

    if (__DEV__) console.log('[App] message received:', type, data ?? raw);

    if (type === '__DEBUG__') { if (__DEV__) console.log('[App] __DEBUG__ from web:', JSON.stringify(data)); return; }
    if (type === 'START_RECORDING') start();
    else if (type === 'STOP_RECORDING') stop();
    else if (type === 'OPEN_SETTINGS') openSettings();
    else if (type === 'PLAY_TTS' && data?.text) {
      Speech.stop();
      Speech.speak(data.text, { language: 'en-US', rate: 0.9 });
    }
    else if (type === 'REQUEST_MIC_PERMISSION') {
      const { granted } = await Audio.requestPermissionsAsync();
      if (__DEV__) console.log('[App] mic permission result:', granted);
      webviewRef.current?.postMessage(
        JSON.stringify({ type: 'MIC_PERMISSION_STATUS', granted }),
      );
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>🐦</Text>
            <Text style={styles.errorTitle}>연결할 수 없어요</Text>
            <Text style={styles.errorMessage}>인터넷 연결을 확인하고{'\n'}다시 시도해주세요.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: WEB_URL }}
            style={styles.webview}
            onLoadEnd={handleLoadEnd}
            onMessage={handleMessage}
            onError={handleError}
            onHttpError={handleError}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E07A3A" />
              </View>
            )}
            startInLoadingState
          />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    inset: 0,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
  },
  errorMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#E07A3A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
