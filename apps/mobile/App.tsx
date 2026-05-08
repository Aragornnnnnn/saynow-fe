// 웹뷰 껍데기 앱 진입점
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const WEB_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000')
  : 'https://saynow.vercel.app';

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      webviewRef.current?.postMessage('BACK_PRESSED');
      return true;
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <WebView
          ref={webviewRef}
          source={{ uri: WEB_URL }}
          style={styles.webview}
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
