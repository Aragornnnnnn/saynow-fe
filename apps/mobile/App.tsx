import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { generateNonce } from './auth/nonce';
import {
  refreshAuthSession,
  socialLogin,
  type NativeAuthSession,
  type SocialProvider,
} from './auth/mobileApi';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './auth/sessionStorage';
import { requestSocialIdToken } from './auth/socialLogin';
import { usePostToWeb, useWebViewBridge } from './bridge/useWebViewBridge';
import type { WebCommandHandlers } from './bridge/useWebViewBridge';
import { NativeLoginScreen } from './components/NativeLoginScreen';
import { useRecorder } from './hooks/useRecorder';

SplashScreen.preventAutoHideAsync();

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? (__DEV__ ? 'http://localhost:3000' : undefined);

type AuthStatus = 'checking' | 'signedOut' | 'signedIn';

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [authSession, setAuthSession] = useState<NativeAuthSession | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const postToWeb = usePostToWeb(webviewRef);
  const { start, stop, openSettings } = useRecorder();

  const bootstrapSession = useCallback(async () => {
    try {
      const storedSession = await loadAuthSession();
      if (!storedSession?.refreshToken || !storedSession.member) {
        setAuthStatus('signedOut');
        return;
      }

      const refreshedSession = await refreshAuthSession(
        storedSession.refreshToken,
        storedSession.member,
      );
      await saveAuthSession(refreshedSession);
      setAuthSession(refreshedSession);
      setAuthStatus('signedIn');
    } catch (error) {
      console.warn('[Auth] 저장된 세션 복구 실패:', error);
      await clearAuthSession();
      setAuthSession(null);
      setAuthStatus('signedOut');
    } finally {
      SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (!__DEV__) return undefined;

    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[AuthDebug][Linking] url received', describeUrl(event.url));
    });

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          console.log('[AuthDebug][Linking] initial url', describeUrl(url));
        }
      })
      .catch((error) => {
        console.warn('[AuthDebug][Linking] initial url failed', error);
      });

    return () => subscription.remove();
  }, []);

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
    AUTH_SESSION_UPDATED: async (message) => {
      const session = {
        accessToken: message.accessToken,
        refreshToken: message.refreshToken,
        member: message.member,
      };
      await saveAuthSession(session);
      setAuthSession(session);
    },
    AUTH_SESSION_CLEARED: async () => {
      await clearAuthSession();
      setAuthSession(null);
      setHasError(false);
      setAuthStatus('signedOut');
    },
  }), [openSettings, postToWeb, start, stop]);
  const isWebViewActive = !!WEB_URL && authStatus === 'signedIn' && !hasError;
  const handleMessage = useWebViewBridge(webCommandHandlers, postToWeb, isWebViewActive);

  const handleNativeLogin = useCallback(async (provider: SocialProvider) => {
    try {
      setPendingProvider(provider);
      setLoginError(null);

      const nonce = generateNonce();
      console.log('[AuthDebug][App] native login start', {
        provider,
        nonceLength: nonce.length,
      });
      const idToken = await requestSocialIdToken(provider, nonce);
      console.log('[AuthDebug][App] provider idToken received', {
        provider,
        idToken: describeToken(idToken),
      });
      const session = await socialLogin(provider, idToken, nonce);
      console.log('[AuthDebug][App] SayNow session received', {
        provider: session.member.provider,
        memberId: session.member.memberId,
        newMember: session.member.newMember,
        accessTokenLength: session.accessToken.length,
        refreshTokenLength: session.refreshToken.length,
      });

      await saveAuthSession(session);
      console.log('[AuthDebug][App] session saved; opening WebView');
      setAuthSession(session);
      setHasError(false);
      setAuthStatus('signedIn');
    } catch (error) {
      console.error('[AuthDebug][App] native login failed', error);
      setLoginError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      console.log('[AuthDebug][App] native login finished', { provider });
      setPendingProvider(null);
    }
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

  const authInjection = useMemo(
    () => (authSession ? createAuthInjection(authSession) : ''),
    [authSession],
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {!WEB_URL ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>!</Text>
            <Text style={styles.errorTitle}>앱 설정이 필요해요</Text>
            <Text style={styles.errorMessage}>EXPO_PUBLIC_WEB_URL을 설정해주세요.</Text>
          </View>
        ) : authStatus === 'checking' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E07A3A" />
          </View>
        ) : authStatus === 'signedOut' ? (
          <NativeLoginScreen
            errorMessage={loginError}
            pendingProvider={pendingProvider}
            onLogin={handleNativeLogin}
          />
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>!</Text>
            <Text style={styles.errorTitle}>연결할 수 없어요</Text>
            <Text style={styles.errorMessage}>인터넷 연결을 확인하고{'\n'}다시 시도해주세요.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            key={authSession?.refreshToken}
            ref={webviewRef}
            source={{ uri: WEB_URL }}
            style={styles.webview}
            webviewDebuggingEnabled={__DEV__}
            injectedJavaScriptBeforeContentLoaded={authInjection}
            injectedJavaScript={authInjection}
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

function createAuthInjection(session: NativeAuthSession) {
  const persistedAuth = {
    state: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      member: session.member,
    },
    version: 0,
  };

  return `
    (function () {
      try {
        localStorage.setItem('saynow-auth', ${JSON.stringify(JSON.stringify(persistedAuth))});
        if (window.location.pathname === '/login') {
          window.location.replace('/');
        }
      } catch (error) {
        console.error('[SayNow Native Auth]', error);
      }
    })();
    true;
  `;
}

function describeToken(token: string) {
  const parts = token.split('.');
  return {
    length: token.length,
    jwtParts: parts.length,
    headerLength: parts[0]?.length ?? 0,
    payloadLength: parts[1]?.length ?? 0,
  };
}

function describeUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return {
      urlPrefix: `${parsedUrl.protocol}${parsedUrl.host ? `//${parsedUrl.host}` : ''}${parsedUrl.pathname}`,
      scheme: parsedUrl.protocol.replace(':', ''),
      host: parsedUrl.host || undefined,
      path: parsedUrl.pathname,
      paramKeys: Array.from(parsedUrl.searchParams.keys()),
    };
  } catch {
    const [urlPrefix, query] = url.split('?');
    return {
      urlPrefix,
      paramKeys: query ? Array.from(new URLSearchParams(query).keys()) : [],
    };
  }
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
