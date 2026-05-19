# STT 내부 동작

## 환경별 엔진

| 환경 | 엔진 | 처리 위치 |
|---|---|---|
| Android 앱 | Google Speech Recognizer | 클라우드 (기본) / 온디바이스 (Android 13+) |
| iOS 앱 | Apple SFSpeechRecognizer | 클라우드 (기본) / 온디바이스 (iOS 17+) |
| 웹 브라우저 | Web Speech API (Chrome: Google) | 클라우드 |

---

## 음성 데이터 흐름

**앱**
```
마이크 → OS 캡처 (PCM) → 네이티브 STT 엔진 → Google/Apple 서버
                                              → transcript(텍스트)만 SayNow 서버로 전달
```

**웹**
```
마이크 → getUserMedia (PCM) → 브라우저 STT → Google 서버
                                            → transcript(텍스트)만 SayNow 서버로 전달
```

음성 파일 자체는 SayNow 서버로 가지 않는다. OS/브라우저가 직접 Google·Apple 서버로 스트리밍하고, 변환된 텍스트만 전달된다.

---

## partial / final 원리

엔진이 오디오 스트림을 실시간으로 분석하며 "지금까지 들린 것"을 계속 예측해서 뱉는 게 partial이다.

```
사용자: "I'd like to order a..."

partial: "I'd"
partial: "I'd like to"
partial: "I'd like to order a"   ← 말 멈춤
final:   "I'd like to order an iced americano"  ← 침묵 후 전체 문맥 보정
```

final이 더 정확한 이유는 말이 끝난 후 전체 문맥을 보고 앞부분을 소급 수정하기 때문이다.

final 트리거는 침묵 감지(약 1~3초)로 자동 발생하지만, SayNow는 마이크 버튼으로 `STOP_STT`를 보내 강제 종료하는 방식을 쓴다. 말 중간에 잠깐 멈춰도 오발화가 없도록 하기 위함이다.

---

## 브릿지 메시지 타입

| 방향 | 타입 | 데이터 | 설명 |
|---|---|---|---|
| 웹 → 네이티브 | `START_STT` | - | STT 시작 |
| 웹 → 네이티브 | `STOP_STT` | - | STT 강제 종료 |
| 네이티브 → 웹 | `STT_PARTIAL` | `transcript: string` | 실시간 중간 결과 |
| 네이티브 → 웹 | `STT_FINAL` | `transcript: string` | 최종 결과 → 서버 전송 |
| 네이티브 → 웹 | `MIC_PERMISSION_DENIED` | - | 권한 거부 |
