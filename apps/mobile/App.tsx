// 웹뷰 껍데기 앱 진입점
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { usePostToWeb, useWebViewBridge } from './bridge/useWebViewBridge';
import type { WebCommandHandlers } from './bridge/useWebViewBridge';
import { useRecorder } from './hooks/useRecorder';

SplashScreen.preventAutoHideAsync();

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? (__DEV__ ? 'http://localhost:3000' : undefined);

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [hasError, setHasError] = useState(false);
  const postToWeb = usePostToWeb(webviewRef);
  const { start, stop, openSettings } = useRecorder();
  const webCommandHandlers = useMemo<WebCommandHandlers>(() => ({
    START_RECORDING: async () => {
      const started = await start();
      if (!started) postToWeb({ type: 'MIC_PERMISSION_DENIED' });
    },
    STOP_RECORDING: async () => {
      const base64 = await stop();
      if (base64) postToWeb({ type: 'RECORDING_DONE', base64 });
    },
    OPEN_SETTINGS: openSettings,
    PLAY_TTS: (message) => {
      Speech.stop();
      Speech.speak(message.text, { language: 'en-US', rate: 0.9 });
    },
    REQUEST_MIC_PERMISSION: async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      postToWeb({ type: 'MIC_PERMISSION_STATUS', granted });
    },
  }), [openSettings, postToWeb, start, stop]);
  const handleMessage = useWebViewBridge(webCommandHandlers, postToWeb);

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {!WEB_URL ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>!</Text>
            <Text style={styles.errorTitle}>앱 설정이 필요해요</Text>
            <Text style={styles.errorMessage}>EXPO_PUBLIC_WEB_URL을 설정해주세요.</Text>
          </View>
        ) : hasError ? (
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
        <StatusBar style="dark" />
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
