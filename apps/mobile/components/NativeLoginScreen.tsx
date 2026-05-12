import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialProvider } from '../auth/mobileApi';
import { GoogleIcon } from './icons/GoogleIcon';
import { KakaoIcon } from './icons/KakaoIcon';

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
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
