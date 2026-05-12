# WebView Native Bridge

앱 안 WebView와 React Native 앱은 `postMessage`로 JSON 메시지를 주고받는다. 현재 bridge는 로그인 시작용이 아니라, WebView가 네이티브 기능을 요청하거나 앱 저장소와 세션을 동기화하는 용도다.

## 현재 책임

- WebView에서 녹음 시작/종료를 요청한다.
- WebView에서 마이크 권한 또는 설정 화면 열기를 요청한다.
- WebView에서 네이티브 TTS 재생을 요청한다.
- Android hardware back 버튼을 WebView에 알려준다.
- WebView에서 refresh token 회전이 일어나면 앱 SecureStore에 새 세션을 전달한다.

## 인증과 bridge의 관계

현재 앱 로그인은 WebView bridge를 통해 시작하지 않는다.

```text
앱 실행
  -> 네이티브 로그인 화면
  -> provider idToken 획득
  -> /api/v1/auth/social-login
  -> SecureStore 저장
  -> WebView 실행
  -> localStorage.saynow-auth 주입
```

WebView bridge는 로그인 이후 refresh token 회전 동기화에만 관여한다.

```text
WebView에서 accessToken 만료
  -> 웹 api client가 refresh 호출
  -> 새 SayNow token 수신
  -> AUTH_SESSION_UPDATED bridge message
  -> 앱 SecureStore 갱신
```

## 파일 구조

| 위치 | 역할 |
| --- | --- |
| `apps/web/src/bridge/messages.ts` | 웹 기준 bridge message 타입 |
| `apps/web/src/bridge/webBridge.ts` | WebView postMessage 송신과 native message 수신 |
| `apps/web/src/bridge/commands.ts` | 웹에서 호출하는 bridge command 함수 |
| `apps/web/src/bridge/useBridgeEvent.ts` | native event 구독 |
| `apps/web/src/hooks/useRecordingBridge.ts` | 녹음 bridge와 브라우저 fallback |
| `apps/web/src/hooks/useTts.ts` | TTS bridge와 브라우저 fallback |
| `apps/web/src/hooks/useBackButtonBridge.ts` | Android back event 처리 |
| `apps/mobile/bridge/messages.ts` | 앱 기준 bridge message 타입 및 parser |
| `apps/mobile/bridge/useWebViewBridge.ts` | WebView message parsing, dispatch, hardware back 전달 |
| `apps/mobile/App.tsx` | 실제 네이티브 command handler 연결 |

## Active Messages

### Web to Native

```ts
type WebToNativeMessage =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'REQUEST_MIC_PERMISSION' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'PLAY_TTS'; text: string; url: string | null }
  | {
      type: 'AUTH_SESSION_UPDATED';
      accessToken: string;
      refreshToken: string;
      member: BridgeAuthMember;
    }
  | { type: 'AUTH_SESSION_CLEARED' };
```

### Native to Web

```ts
type NativeToWebMessage =
  | { type: 'RECORDING_DONE'; base64: string; mimeType?: string }
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'MIC_PERMISSION_STATUS'; granted: boolean }
  | { type: 'BACK_PRESSED' };
```

## Removed Login Messages

이전 구조에서는 WebView가 `REQUEST_SOCIAL_LOGIN`을 보내고 앱이 `SOCIAL_LOGIN_RESULT`를 돌려줬다. 현재는 앱이 네이티브 로그인 화면에서 먼저 로그인하고 WebView를 열기 때문에 해당 login bridge 메시지는 제거했다.

## 메시지 규칙

1. 새 메시지는 양쪽 `messages.ts` union type에 먼저 추가한다.
2. 앱으로 들어오는 payload는 parser에서 검증한다.
3. 화면 컴포넌트는 `window.ReactNativeWebView.postMessage`를 직접 호출하지 않는다.
4. 웹에서는 `commands.ts` 또는 domain hook을 통해 bridge를 사용한다.
5. 앱에서는 `App.tsx`의 `WebCommandHandlers`에 handler를 등록한다.
6. 브라우저에서도 동작해야 하는 기능은 fallback을 둔다.

## 남은 작업

- bridge message 타입을 웹과 앱에서 중복 관리하지 않도록 공유 타입화 검토
