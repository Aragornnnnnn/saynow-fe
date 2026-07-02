# SDK 56 업그레이드 컨텍스트 노트

작업일: 2026-07-02

## 배경

Play Console 크래시: `com.goodatlas.audiorecord.RNAudioRecordModule$1.run` SIGABRT
(`releaseBuffer: mUnreleased out of range`). 삼성 Android 15/16, 6명 영향.

원인: `react-native-audio-record`(2020년 이후 방치)의 녹음 스레드가 인스턴스 필드
`recorder`를 공유해서, 이전 턴 스레드가 늦게 죽으면 새 턴의 recorder를 read/stop
→ 네이티브 assert → 앱 전체 abort.

## 결정 사항

1. **라이브러리 교체 대상 = 공식 expo-audio `useAudioStream`** (SDK 56 신규 API).
   - 서드파티 후보였던 `@siteed/expo-audio-studio`는 deprecated → `@siteed/audio-studio`로 개명됨.
     지금 서드파티로 갈아타면 SDK 56 업그레이드 때 두 번 마이그레이션하게 되어 제외.
   - `react-native-live-audio-stream`은 goodatlas 포크라 동일 버그 → 제외.
2. **핫픽스 선배포** (41c5b57): 업그레이드 검증 기간 동안 크래시 방어.
   `AudioRecord.stop()`의 resolve가 네이티브 스레드 종료 시점이라는 점을 이용해
   다음 `start()` 전에 대기 (2초 타임아웃). init 제거만으로는 불충분 —
   이전 스레드가 늦게 `recorder.stop()`을 호출하는 경로가 남기 때문.
3. **mvp3 브랜치에서 in-place 진행**: WIP가 package.json을 물고 있어 브랜치 전환이
   막히는 상태라 별도 브랜치 대신 의미 단위 커밋으로 롤백 가능성 확보.

## 확인된 사실

- `useAudioStream` 옵션: `{ sampleRate, channels, encoding: 'float32'|'int16', onBuffer }`.
  int16 네이티브 지원 → Deepgram linear16에 ArrayBuffer 그대로 전송 가능.
  base64 인코딩/디코딩 오버헤드 자체가 사라짐.
- `buffer.sampleRate`는 요청값과 다를 수 있음("hardware cannot deliver") —
  Deepgram URL이 16000으로 고정이므로 불일치 시 로그 필요. Android는 16k 사실상 보장.
- `expo-av`: apps/mobile 코드 어디서도 import 안 함 → 그냥 제거.
- `expo-speech-recognition`은 SDK 버전에 맞춰 릴리즈됨 (v56.0.1 = SDK 56용).
- SDK 56: RN 0.85, React 19.2, iOS 최소 16.4 (우리는 Android만 빌드 — 무관).
- 루트 package.json에 expo/react/react-native 의존성이 WIP로 추가돼 있음 (모노레포
  워크스페이스 아님, --prefix 방식). 모바일 빌드와 별개라 이번 작업에서 건드리지 않음.

## 미해결 / 리스크

- ~~`@react-native-kakao` 2.4.5의 RN 0.85 호환 여부 미검증~~ → assembleDebug 컴파일 통과로 해소 (런타임은 실기기 확인 필요).
- `useAudioStream`은 출시 1개월차 신생 API — 실기기 검증 필수.
- ~~`stream.stop()` 후 재-`start()` 가능 여부~~ → sdk-56 네이티브 소스(AudioStream.kt)에서 확인.
  start()마다 새 AudioRecord 생성, stop()이 코루틴 취소 후 해제. 재시작 가능하고 스레드 레이스 구조적으로 없음.
- 기존 WIP인 attribution/installReferrer.ts가 expo-application 미설치로 타입 에러 상태 (이번 작업과 무관, 별도 처리 필요).
