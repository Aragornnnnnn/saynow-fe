import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialProvider } from '../auth/mobileApi';

type NativeLoginScreenProps = {
  errorMessage: string | null;
  pendingProvider: SocialProvider | null;
  onLogin: (provider: SocialProvider) => void;
};

export function NativeLoginScreen({
  errorMessage,
  pendingProvider,
  onLogin,
}: NativeLoginScreenProps) {
  const isPending = pendingProvider !== null;

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Image
          source={require('../assets/saynow-character.png')}
          style={styles.character}
          resizeMode="contain"
        />
        <View style={styles.copy}>
          <Text style={styles.title}>실제 상황으로 연습하고,{'\n'}긴급한 교정 피드백까지</Text>
          <Text style={styles.description}>AI와 함께, 진짜 영어 대화를 시작하세요</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={isPending}
          onPress={() => onLogin('KAKAO')}
          style={({ pressed }) => [
            styles.button,
            styles.kakaoButton,
            (pressed || isPending) && styles.pressed,
          ]}
        >
          <KakaoIcon />
          <Text style={styles.kakaoText}>
            {pendingProvider === 'KAKAO' ? '카카오 로그인 중...' : '카카오로 시작하기'}
          </Text>
        </Pressable>

        <Pressable
          disabled={isPending}
          onPress={() => onLogin('GOOGLE')}
          style={({ pressed }) => [
            styles.button,
            styles.googleButton,
            (pressed || isPending) && styles.pressed,
          ]}
        >
          <GoogleIcon />
          <Text style={styles.googleText}>
            {pendingProvider === 'GOOGLE' ? '구글 로그인 중...' : '구글로 시작하기'}
          </Text>
        </Pressable>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const KAKAO_ICON_URI =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 2C6.029 2 2 5.186 2 9.125c0 2.537 1.664 4.764 4.18 6.054l-1.065 3.965a.298.298 0 0 0 .453.325l4.794-3.175A11.4 11.4 0 0 0 11 16.25c4.971 0 9-3.186 9-7.125S15.971 2 11 2Z" fill="#191919"/></svg>',
  );

const GOOGLE_ICON_URI =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35Z" fill="#4285F4"/><path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A10 10 0 0 0 10 20Z" fill="#34A853"/><path d="M4.405 11.9A6.02 6.02 0 0 1 4.09 10c0-.662.114-1.305.314-1.9V5.51H1.064A10 10 0 0 0 0 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59Z" fill="#FBBC04"/><path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0A10 10 0 0 0 1.064 5.51l3.34 2.59C5.19 5.736 7.396 3.977 10 3.977Z" fill="#E94235"/></svg>',
  );

function KakaoIcon() {
  return <Image source={{ uri: KAKAO_ICON_URI }} style={styles.kakaoIcon} />;
}

function GoogleIcon() {
  return <Image source={{ uri: GOOGLE_ICON_URI }} style={styles.googleIcon} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  character: {
    width: 180,
    height: 180,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#171717',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 33,
    textAlign: 'center',
  },
  description: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  pressed: {
    opacity: 0.72,
  },
  kakaoText: {
    color: '#191919',
    fontSize: 16,
    fontWeight: '700',
  },
  googleText: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '700',
  },
  kakaoIcon: {
    width: 22,
    height: 22,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
