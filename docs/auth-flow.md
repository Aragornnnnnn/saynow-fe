# SayNow Auth Flow

현재 인증 구조는 환경별로 명확히 분리한다.

- **웹 브라우저**: Next.js 웹 앱이 직접 OAuth를 진행한다.
- **모바일 앱**: WebView 안에서 웹 로그인 페이지를 띄우고, 완료된 세션을 앱이 SecureStore에 보관한다.

---

## 핵심 원칙

1. 백엔드 인증의 최종 진입점은 항상 `POST /api/v1/auth/social-login`이다.
2. provider OAuth 토큰은 웹이 획득하고, 백엔드는 `idToken`을 검증한 뒤 SayNow 토큰을 발급한다.
3. 모바일 앱의 영구 인증 저장소는 `SecureStore`다.
4. WebView `localStorage`는 웹 앱을 로그인 상태로 실행하기 위한 동기화 복사본이다.

---

## 앱 로그인 플로우 (카카오 기준)

### 1단계 — Kakao JS SDK로 카카오톡 앱 실행

```
[웹 /login 페이지]
  사용자가 카카오 버튼 클릭
  → startWebSocialLogin('KAKAO', nonce) 호출
  → nonce, state, redirectUri를 sessionStorage에 저장
  → Kakao JS SDK 동적 로드 (t1.kakaocdn.net)
  → Kakao.Auth.authorize({ redirectUri, state, nonce, scope: 'openid,profile_nickname' })

[WebView onShouldStartLoadWithRequest]
  SDK가 생성한 intent:#Intent;action=com.kakao.talk... URL 감지
  → openIntentUrl() 파싱
  → Linking.sendIntent(action, extras) 호출
  → 카카오톡 앱 실행
```

### 2단계 — 카카오톡 동의 및 콜백

```
[카카오톡 앱]
  사용자 동의
  → redirect_uri로 돌아옴: /auth/kakao/callback?code=...&state=...

[웹 /auth/kakao/callback 페이지]
  sessionStorage에서 pending(nonce, state, redirectUri) 읽기
  → state 값 검증
  → POST /auth/oauth-token 호출 (서버사이드에서 code → id_token 교환)
      └ Next.js Route Handler → kauth.kakao.com/oauth/token 호출
  → id_token + nonce로 SayNow 백엔드 로그인 API 호출
      └ POST /api/v1/auth/social-login
      └ 응답: { accessToken, refreshToken, member }
  → Zustand authStore에 저장
  → updateNativeAuthSession() 호출 → postMessage로 앱에 전달
  → / 로 리다이렉트
```

### 3단계 — 앱이 세션 저장

```
[앱 webCommandHandlers.AUTH_SESSION_UPDATED]
  → { accessToken, refreshToken, member }를 SecureStore에 저장
  → authSession state 업데이트 (authInjection 재생성)
```

---

## 앱 재시작 시 세션 복구

```
[App.tsx bootstrapSession]
  → SecureStore에서 { refreshToken, member } 읽기
  → refreshToken 없음: authStatus = 'signedOut' → 웹 /login 표시
  → refreshToken 있음: POST /api/v1/auth/token/refresh 호출
      → 성공: 새 세션을 SecureStore에 저장, authSession 업데이트
      → 실패: SecureStore 초기화, authStatus = 'signedOut'

[WebView 열릴 때 (authSession이 있는 경우)]
  injectedJavaScriptBeforeContentLoaded로 authInjection 실행
  → localStorage['saynow-auth'] 세팅
  → 웹 authStore가 값을 읽어 로그인 상태로 진입
  → 웹이 /login 이면 / 로 이동
```

---

## 로그아웃

```
[웹에서 로그아웃]
  → authStore clear + clearNativeAuthSession() 호출 (postMessage → 앱)

[앱 webCommandHandlers.AUTH_SESSION_CLEARED]
  → SecureStore 초기화
  → authSession = null, authStatus = 'signedOut'
  → WebView key 변경 → 재마운트 → 웹 /login 표시
```

---

## 세션 저장 위치 요약

| 위치 | 저장 내용 | 역할 |
|---|---|---|
| 앱 SecureStore | accessToken, refreshToken, member | 앱 재시작 후 복구용 |
| 웹 localStorage `saynow-auth` | accessToken, refreshToken, member | 웹 authStore 초기화용 |
| 웹 sessionStorage `saynow-social-login` | nonce, state, redirectUri | 로그인 진행 중 검증용 (완료 후 삭제) |

---

## 토큰 갱신 (앱 WebView)

웹 앱이 API 401을 받으면 자체적으로 refresh를 수행한다. refresh token은 회전되므로 새 토큰을 앱에도 전달한다.

```
WebView 내 API 401
  → POST /api/v1/auth/token/refresh
  → authStore 갱신
  → AUTH_SESSION_UPDATED bridge message → 앱 SecureStore 갱신
```

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `apps/mobile/App.tsx` | 세션 부트스트랩, intent 처리, WebView 렌더 |
| `apps/mobile/auth/sessionStorage.ts` | SecureStore 읽기/쓰기 |
| `apps/mobile/auth/mobileApi.ts` | 토큰 갱신 API |
| `apps/mobile/bridge/useWebViewBridge.ts` | postMessage 수신 처리 |
| `apps/web/src/lib/webSocialLogin.ts` | Kakao JS SDK 동적 로드 및 authorize 호출 |
| `apps/web/src/app/auth/[provider]/callback/page.tsx` | OAuth 콜백, 토큰 교환, 세션 저장 |
| `apps/web/src/app/auth/oauth-token/route.ts` | 서버사이드 code → id_token 교환 |
| `apps/web/src/bridge/commands.ts` | 앱으로 postMessage 전송 |

---

## 환경변수

### `apps/web/.env.local`

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | Kakao REST API 키 (OAuth code 교환용) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | Kakao JavaScript 키 (JS SDK 초기화용) |
| `KAKAO_CLIENT_SECRET` | Kakao token exchange client secret (서버 전용) |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | Kakao callback URI |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google 웹 OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google token exchange client secret (서버 전용) |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | Google callback URI |

### `apps/mobile/.env`

| 변수 | 용도 |
|---|---|
| `EXPO_PUBLIC_WEB_URL` | WebView가 로드할 Next.js 주소 |

---

## Kakao 개발자 콘솔 설정 체크리스트

- 앱 플랫폼 → Web 도메인 등록 (JS SDK 사용 도메인)
- 카카오 로그인 → 활성화
- 카카오 로그인 → Redirect URI 등록
- OpenID Connect → 활성화 (id_token 발급에 필요)
- 동의항목: `profile_nickname` 필수 동의
