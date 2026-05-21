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

`continuous: true` 모드에서 silence detection(약 1~3초)이 자동으로 `end` 이벤트를 발생시킨다. SayNow는 마이크 버튼으로 `STOP_STT`를 보내 강제 종료하는 방식을 쓰며, 자동 종료가 발생하면 `end` 이벤트에서 자동 재시작한다.

---

## 상태 머신 (웹 페이지 기준)

```
loading ──→ idle ──→ recording ──→ stopping ──→ submitting ──→ idle
                       ↑               │                         │
                       └──(자동재시작)──┘                         ↓
                                                               error
```

| 상태 | 설명 | 진입 조건 | 탈출 조건 |
|---|---|---|---|
| `loading` | 세션 초기화 중 | 페이지 진입 | `startSession()` 완료 |
| `idle` | 입력 대기 | 초기화 완료 / 제출 완료 / 에러 복구 | 마이크 버튼 클릭 |
| `recording` | STT 수신 중 | 마이크 버튼 클릭 | 버튼 재클릭 → `stopping` |
| `stopping` | 종료 후 최종 결과 대기 | 버튼 재클릭 | `STT_FINAL` 수신 → `submitting` / `idle` |
| `submitting` | API 요청 중 | transcript 제출 | 응답 완료 → `idle` |
| `error` | 복구 불가 에러 | API 실패 | 페이지 재진입 |

---

## 정상 플로우 (앱 기준)

```
1. 사용자: 마이크 버튼 클릭
   웹: transcriptRef 초기화 → START_STT 전송 → pageState = 'recording'

2. 네이티브: ExpoSpeechRecognitionModule.start() 호출
   - isRunningRef = true (중복 start 방어)

3. 네이티브: 음성 인식 중
   → STT_PARTIAL 이벤트 → 웹에 transcript 실시간 표시

4. 사용자: 마이크 버튼 다시 클릭
   웹: pageState = 'stopping' → STOP_STT 전송 → 3초 타임아웃 시작

5. 네이티브: ExpoSpeechRecognitionModule.stop() 호출
   - isRunningRef = false
   - 남은 오디오 처리 후 STT_FINAL 이벤트 발생

6. 웹: STT_FINAL 수신 (pageState === 'stopping')
   → 타임아웃 클리어 → transcript 제출 → pageState = 'submitting'

7. 웹: API 응답 → pageState = 'idle'
```

---

## silence detection 처리

- **iOS** — `continuous: true`이면 `stop()` 호출 전까지 자동 종료 없음. silence detection 비활성화 상태.
- **Android 13+** — `continuous: true` + `androidIntentOptions`로 silence timeout을 30초로 설정해 사실상 자동 종료 방지.
- **Android 12 이하** — `continuous` 미지원. silence detection으로 자동 종료될 수 있음.

Android 12 이하에서 자동 종료 STT_FINAL이 오는 경우 웹은 transcript만 업데이트하고 제출하지 않는다. 사용자가 마이크 버튼을 눌러야만 제출된다.

---

## 에러 케이스 및 처리

### 1. stopping 타임아웃 (STT_FINAL이 안 오는 경우)

**원인.** 네트워크 단절, 모듈 크래시, WebView 메시지 유실 등.

```
stopping 진입 시 3초 타임아웃 시작
→ 3초 내 STT_FINAL 없으면:
   - transcriptRef에 내용 있으면 → 그대로 제출 (submitting)
   - 없으면 → emptyToast 표시 후 idle 복구
```

### 2. STT 엔진 에러 (STT_ERROR)

**원인.** 권한 박탈(런타임), 네트워크 에러, 엔진 내부 오류.

```
네이티브: error 이벤트 → isRunningRef = false → STT_ERROR 브릿지 전송
웹: STT_ERROR 수신
   → 타임아웃 클리어
   → stopping/recording 상태에서:
      - transcript 있으면 → 제출
      - 없으면 → emptyToast + idle 복구
```

### 3. 마이크 권한 거부 (MIC_PERMISSION_DENIED)

**원인.** 최초 권한 거부 또는 런타임 권한 박탈.

```
네이티브: not-allowed 에러 → MIC_PERMISSION_DENIED 브릿지 전송
웹: 타임아웃 클리어 → MicDeniedModal 표시 → idle 복구
```

사용자가 설정에서 권한을 허용하고 돌아오면 별도 재시도 없이 마이크 버튼을 다시 누르면 된다. (권한 확인은 `start()` 호출 시점에 다시 수행)

### 4. 빈 transcript로 종료

**원인.** 마이크 눌렀는데 아무 말 안 하고 종료.

```
stopping → STT_FINAL (transcript 빈 값) 수신
→ emptyToast ("목소리가 안 들렸어요, 다시 눌러서 말해주세요 🎤") 표시
→ idle 복구
```

### 5. 중복 start() 방어

```
isRunningRef === true이면 start() 즉시 return
→ 버튼 연타, 빠른 재진입 시 중복 ExpoSpeechRecognitionModule.start() 호출 차단
```

### 6. 웹 브라우저 STT 에러

```
getUserMedia 실패 → MicDeniedModal + idle 복구
SpeechRecognition onerror → not-allowed이면 modal, 그 외 idle 복구
```

---

## 브릿지 메시지 타입

| 방향 | 타입 | 데이터 | 설명 |
|---|---|---|---|
| 웹 → 네이티브 | `START_STT` | - | STT 시작 |
| 웹 → 네이티브 | `STOP_STT` | - | STT 강제 종료 |
| 네이티브 → 웹 | `STT_PARTIAL` | `transcript: string` | 실시간 중간 결과 |
| 네이티브 → 웹 | `STT_FINAL` | `transcript: string` | 최종 결과 (stop 후 또는 silence) |
| 네이티브 → 웹 | `STT_ERROR` | - | 엔진 에러 (권한 외) → idle 강제 복구 |
| 네이티브 → 웹 | `MIC_PERMISSION_DENIED` | - | 마이크 권한 거부 |

---

## 미결 사항

- Android / iOS별 silence detection 타이밍 차이 실측 필요 (현재 3초 타임아웃은 보수적 추정)
- 자동 재시작 중 짧은 음성 누락 구간 허용 여부 재검토
- stopping 타임아웃 값 튜닝 (현재 3000ms)
