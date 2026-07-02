# SDK 56 업그레이드 체크리스트

목표: Expo SDK 54 → 56 업그레이드 + `react-native-audio-record`(방치, 삼성 SIGABRT 크래시 원인)를 공식 `expo-audio useAudioStream`으로 교체.

## 사전 검증

- [x] `useAudioStream`이 16kHz 모노 int16 지원 확인 (sdk-56 소스에서 확인 — encoding: 'int16' 네이티브 지원)
- [x] `expo-speech-recognition` SDK 56 지원 확인 (v56.0.1 릴리즈됨)
- [x] 급한 불 핫픽스 커밋 (41c5b57 — stop Promise 대기)

## 패키지 업그레이드

- [x] `apps/mobile`: expo ~56 + `npx expo install --fix` (expo 56.0.13, RN 0.85.3, React 19.2.3)
- [x] `expo-speech-recognition` → ^56.0.1
- [x] `expo-av` 제거 (코드에서 미사용 확인됨)
- [x] `react-native-audio-record` 제거
- [x] `expo-audio` ~56.0.12 추가 (useAudioStream 제공 패키지, config plugin 자동 등록)
- [x] `patch-kakao-user-nonce.js` postinstall 정상 적용 확인

## 코드 마이그레이션

- [x] `useStt.ts`: AudioRecord → `useAudioStream` 교체 (int16 ArrayBuffer 직송, base64 디코딩 제거)
- [x] 핫픽스로 넣은 stopPromise 대기 로직 제거 (새 API는 불필요)
- [x] 타입체크 통과 (`npx tsc --noEmit` — 기존 WIP의 expo-application 에러만 남음)

## 네이티브 빌드

- [x] `plugins/withGradleVersion` (Gradle 8.13 고정) 제거 — SDK 56 템플릿 Gradle로 다운그레이드시키는 문제 방지
- [x] `npx expo prebuild -p android --clean` (Gradle 9.3.1로 생성됨)
- [x] `gradlew assembleDebug` 컴파일 통과 (12m 7s, app-debug.apk 생성)

## 실기기 테스트 (사용자 직접)

- [ ] 카카오 로그인
- [ ] STT 대화 여러 턴 (Deepgram 경로)
- [ ] 빠른 스탑↔스타트 반복 (크래시 재현 시도)
- [ ] 비행기 모드 등으로 Deepgram 실패 → 네이티브 폴백 동작
- [ ] TTS 재생
- [ ] 웹뷰 브리지 (postMessage 통신)
- [ ] Meta SDK 이벤트 로깅
