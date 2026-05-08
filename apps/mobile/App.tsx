// 웹뷰 껍데기 앱 진입점
import { Audio } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useRecorder } from './hooks/useRecorder';

SplashScreen.preventAutoHideAsync();

const WEB_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000')
  : 'https://saynow.vercel.app';

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  const handleRecorded = useCallback((uri: string) => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'RECORDING_DONE', uri }));
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
    const { granted } = await Audio.requestPermissionsAsync();
    webviewRef.current?.postMessage(
      JSON.stringify({ type: 'MIC_PERMISSION_STATUS', granted }),
    );
  }

  function handleMessage(e: WebViewMessageEvent) {
    const data = e.nativeEvent.data;
    if (data === 'START_RECORDING') start();
    else if (data === 'STOP_RECORDING') stop();
    else if (data === 'OPEN_SETTINGS') openSettings();
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <WebView
          ref={webviewRef}
          source={{ uri: WEB_URL }}
          style={styles.webview}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          onNavigationStateChange={(state) => {
            canGoBackRef.current = state.canGoBack;
          }}
        />
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
});
