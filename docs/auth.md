# Auth API Contract

SayNow 인증은 provider OIDC idToken을 백엔드가 검증하고, 자체 SayNow access token과 refresh token을 발급하는 방식이다.

## 공통 규칙

- Base path: `/api/v1`
- 응답 envelope: `{ success, data, error }`
- 인증이 필요한 API는 `Authorization: Bearer {accessToken}` 헤더를 사용한다.
- refresh token은 회전 방식이다. 재발급 성공 시 기존 refresh token은 더 이상 쓰지 않는다.

## Provider

| provider | issuer | 주요 scope | 식별자 |
| --- | --- | --- | --- |
| `GOOGLE` | `https://accounts.google.com` | `openid email profile` | idToken `sub` |
| `KAKAO` | `https://kauth.kakao.com` | `openid profile_nickname` | idToken `sub` |

백엔드는 provider별로 idToken의 signature, issuer, audience, expiry, nonce를 검증한다.

## 소셜 로그인

`POST /api/v1/auth/social-login`

provider idToken을 검증하고 SayNow 토큰을 발급한다.

### Request

```json
{
  "provider": "KAKAO",
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "nonce": "f95f0c8c2b9d4a3c9e3e6b2e"
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `provider` | string | O | `GOOGLE` 또는 `KAKAO` |
| `idToken` | string | O | provider가 발급한 OIDC ID Token |
| `nonce` | string | O | 로그인 요청 때 프론트가 생성한 nonce |

### Success

```json
{
  "success": true,
  "data": {
    "tokenType": "Bearer",
    "accessToken": "saynow-access-token",
    "accessTokenExpiresIn": 1800,
    "refreshToken": "saynow-refresh-token",
    "refreshTokenExpiresIn": 1209600,
    "member": {
      "memberId": "1",
      "nickname": "Ryan",
      "email": "ryan@example.com",
      "provider": "KAKAO",
      "newMember": true
    }
  },
  "error": null
}
```

`member.nickname`과 `member.email`은 provider 동의항목과 idToken claim에 따라 `null`일 수 있다.

## 토큰 재발급

`POST /api/v1/auth/token/refresh`

refresh token을 회전하고 새 SayNow 토큰을 발급한다.

### Request

```json
{
  "refreshToken": "saynow-refresh-token"
}
```

### Success

```json
{
  "success": true,
  "data": {
    "tokenType": "Bearer",
    "accessToken": "new-saynow-access-token",
    "accessTokenExpiresIn": 1800,
    "refreshToken": "new-saynow-refresh-token",
    "refreshTokenExpiresIn": 1209600
  },
  "error": null
}
```

프론트는 성공 응답을 받으면 저장된 refresh token을 반드시 새 값으로 교체해야 한다.

## 로그아웃

`POST /api/v1/auth/logout`

refresh token을 폐기한다.

### Request

```json
{
  "refreshToken": "saynow-refresh-token"
}
```

### Success

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

프론트는 API 성공 여부와 무관하게 로컬 인증 상태를 삭제하는 방향이 안전하다.

## 주요 에러

| HTTP | code | 의미 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | 요청 값이 올바르지 않음 |
| 400 | `UNSUPPORTED_SOCIAL_PROVIDER` | 지원하지 않는 provider |
| 400 | `OIDC_TOKEN_INVALID` | provider idToken 검증 실패 |
| 400 | `OIDC_NONCE_MISMATCH` | 요청 nonce와 idToken nonce 불일치 |
| 401 | `REFRESH_TOKEN_INVALID` | refresh token이 유효하지 않음 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 오류 |
| 503 | `OIDC_PROVIDER_UNAVAILABLE` | provider JWKS 또는 검증 서버 장애 |

## 프론트 저장 정책

| 위치 | 저장 방식 |
| --- | --- |
| 웹 브라우저 accessToken | Zustand 메모리 |
| 웹 브라우저 refreshToken | `localStorage.saynow-auth` |
| 앱 accessToken | 앱 state 및 `SecureStore` 세션 |
| 앱 refreshToken | `SecureStore` |
| 앱 WebView token | 앱이 `localStorage.saynow-auth`에 주입한 복사본 |

앱 환경에서는 `SecureStore`가 source of truth다. WebView localStorage는 웹 앱 구동을 위한 복사본으로만 취급한다.

## 관련 구현 파일

| 파일 | 역할 |
| --- | --- |
| `apps/web/src/app/login/page.tsx` | 웹 로그인 UI |
| `apps/web/src/lib/webSocialLogin.ts` | 웹 OAuth URL 생성 및 pending login 저장 |
| `apps/web/src/app/auth/[provider]/callback/page.tsx` | 웹 OAuth callback 처리 |
| `apps/web/src/app/auth/oauth-token/route.ts` | authorization code를 idToken으로 교환 |
| `apps/web/src/lib/api/auth.ts` | auth API 호출 |
| `apps/web/src/lib/api/client.ts` | Authorization 헤더와 refresh retry 처리 |
| `apps/web/src/store/authStore.ts` | 웹 authStore |
| `apps/mobile/auth/socialLogin.ts` | 앱 provider idToken 획득 |
| `apps/mobile/auth/mobileApi.ts` | 앱 auth API 호출 |
| `apps/mobile/auth/sessionStorage.ts` | 앱 SecureStore 저장 |
| `apps/mobile/App.tsx` | 앱 로그인 상태와 WebView 세션 주입 |
