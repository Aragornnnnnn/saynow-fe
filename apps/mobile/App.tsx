import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  NativeModules,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { generateNonce } from './auth/nonce';
import { refreshAuthSession, socialLogin } from './auth/mobileApi';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './auth/sessionStorage';
import { requestSocialIdToken } from './auth/socialLogin';
import { usePostToWeb, useWebViewBridge } from './bridge/useWebViewBridge';
import type { WebCommandHandlers } from './bridge/useWebViewBridge';
import { useStt } from './hooks/useStt';

SplashScreen.preventAutoHideAsync();

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? (__DEV__ ? 'http://localhost:3000' : undefined);

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [authScript, setAuthScript] = useState<string | null>(null);
  const postToWeb = usePostToWeb(webviewRef);
  const { start: startStt, stop: stopStt } = useStt({
    onPartial: (transcript) => postToWeb({ type: 'STT_PARTIAL', transcript }),
    onFinal: (transcript) => postToWeb({ type: 'STT_FINAL', transcript }),
    onDenied: () => postToWeb({ type: 'MIC_PERMISSION_DENIED' }),
    onError: () => postToWeb({ type: 'STT_ERROR' }),
  });

  useEffect(() => {
    async function bootstrap() {
      try {
        const stored = await loadAuthSession();
        if (stored?.refreshToken && stored.member) {
          const refreshed = await refreshAuthSession(stored.refreshToken, stored.member);
          await saveAuthSession(refreshed);
          setAuthScript(createAuthScript(refreshed));
        }
      } catch {
        await clearAuthSession();
      } finally {
        setIsReady(true);
        // 스플래시는 WebView onLoadEnd에서 숨김
      }
    }
    bootstrap();
  }, []);

  const webCommandHandlers = useMemo<WebCommandHandlers>(() => ({
    START_STT: (message) => startStt({ contextualStrings: message.contextualStrings, languageModel: message.languageModel }),
    STOP_STT: () => stopStt(),
    OPEN_SETTINGS: () => Linking.openSettings(),
    PLAY_TTS: (message) => {
      Speech.stop();
      Speech.speak(message.text, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => postToWeb({ type: 'TTS_END' }),
        onStopped: () => postToWeb({ type: 'TTS_END' }),
        onError: () => postToWeb({ type: 'TTS_END' }),
      });
    },
    NATIVE_LOGIN: async (message) => {
      try {
        const nonce = generateNonce();
        const idToken = await requestSocialIdToken(message.provider, nonce);
        const session = await socialLogin(message.provider, idToken, nonce);
        await saveAuthSession(session);
        postToWeb({
          type: 'NATIVE_LOGIN_SUCCESS',
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          member: session.member,
        });
      } catch (error) {
        postToWeb({
          type: 'NATIVE_LOGIN_ERROR',
          message: error instanceof Error ? error.message : '로그인에 실패했습니다.',
        });
      }
    },
    AUTH_SESSION_UPDATED: async (message) => {
      await saveAuthSession({
        accessToken: message.accessToken,
        refreshToken: message.refreshToken,
        member: message.member,
      });
    },
    AUTH_SESSION_CLEARED: async () => {
      await clearAuthSession();
      setHasError(false);
    },
    EXIT_APP: () => {
      BackHandler.exitApp();
    },
    HAPTIC: (message) => {
      const style = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[message.style];
      Haptics.impactAsync(style);
    },
  }), [postToWeb, startStt, stopStt]);

  const isWebViewActive = !!WEB_URL && isReady && !hasError;
  const handleMessage = useWebViewBridge(webCommandHandlers, postToWeb, isWebViewActive);

  function handleError() {
    SplashScreen.hideAsync();
    setHasError(true);
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {!WEB_URL ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>!</Text>
            <Text style={styles.errorTitle}>앱 설정이 필요해요</Text>
            <Text style={styles.errorMessage}>EXPO_PUBLIC_WEB_URL을 설정해주세요.</Text>
          </View>
        ) : !isReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E07A3A" />
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>!</Text>
            <Text style={styles.errorTitle}>연결할 수 없어요</Text>
            <Text style={styles.errorMessage}>인터넷 연결을 확인하고{'\n'}다시 시도해주세요.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { setHasError(false); webviewRef.current?.reload(); }}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: WEB_URL }}
            style={styles.webview}
            webviewDebuggingEnabled={__DEV__}
            javaScriptCanOpenWindowsAutomatically
            setSupportMultipleWindows
            injectedJavaScriptBeforeContentLoaded={authScript ?? 'true;'}
            onLoadEnd={() => SplashScreen.hideAsync()}
            onMessage={handleMessage}
            onError={handleError}
            onHttpError={handleError}
            onShouldStartLoadWithRequest={({ url }) => {
              if (
                url.startsWith('kakaokompassauth://') ||
                url.startsWith('kakaolink://') ||
                url.startsWith('kakaotalk://')
              ) {
                Linking.openURL(url).catch(() => {});
                return false;
              }
              if (url.startsWith('intent:')) {
                NativeModules.IntentModule?.openIntentUri(url);
                return false;
              }
              return true;
            }}
            onOpenWindow={(event) => {
              const { targetUrl } = event.nativeEvent;
              if (
                targetUrl.startsWith('kakaokompassauth://') ||
                targetUrl.startsWith('kakaotalk://')
              ) {
                Linking.openURL(targetUrl).catch(() => {});
              } else if (targetUrl.startsWith('intent:')) {
                NativeModules.IntentModule?.openIntentUri(targetUrl);
              } else {
                webviewRef.current?.injectJavaScript(
                  `window.location.href = ${JSON.stringify(targetUrl)};`
                );
              }
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E07A3A" />
              </View>
            )}
            startInLoadingState
          />
        )}
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

function createAuthScript(session: { accessToken: string; refreshToken: string; member: object }) {
  const persisted = JSON.stringify({
    state: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      member: session.member,
    },
    version: 0,
  });
  return `
    (function () {
      try {
        localStorage.setItem('landit-auth', ${JSON.stringify(persisted)});
        if (window.location.pathname === '/login') window.location.replace('/home');
      } catch (e) {}
    })();
    true;
  `;
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
