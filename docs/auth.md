# Auth — 소셜 로그인 설계 및 구현

## 1. 개요

Google, Kakao OIDC 기반 소셜 로그인. 앱이 ID Token을 획득하고 백엔드가 검증 후 SayNow 자체 토큰을 발급한다.

---

## 2. 전체 로그인 흐름

```
사용자 버튼 클릭 (웹 /login)
  → postMessage('REQUEST_SOCIAL_LOGIN', provider, nonce)
  → 네이티브(Expo)가 Google/Kakao SDK로 로그인 실행
  → ID Token 획득
  → postMessage('SOCIAL_LOGIN_RESULT', provider, idToken)
  → 웹이 POST /api/v1/auth/social-login 호출
  → 백엔드: ID Token 서명·issuer·audience·nonce 검증
  → 백엔드: members / social_accounts 조회 또는 생성
  → SayNow access token + refresh token 발급
  → 웹이 authStore에 저장 → / 로 이동
```

WebView 안에서 Google/Kakao 팝업은 막히기 때문에 반드시 네이티브 SDK가 로그인을 처리하고 결과를 postMessage로 웹에 전달한다.

---

## 3. 역할 분리

### 프론트엔드 (웹)
- 로그인 버튼 UI 제공 (`/login` 페이지)
- 로그인 요청마다 nonce 생성 (crypto.getRandomValues)
- 네이티브로 `REQUEST_SOCIAL_LOGIN` postMessage 전송
- 네이티브로부터 `SOCIAL_LOGIN_RESULT` 수신
- `POST /api/v1/auth/social-login` 호출
- SayNow access token / refresh token을 authStore에 저장
- 이후 API 호출에 `Authorization: Bearer {accessToken}` 자동 첨부
- 401 응답 시 refresh 1회 시도, 실패 시 `/login`으로 이동

### 프론트엔드 (앱 · Expo)
- 웹으로부터 `REQUEST_SOCIAL_LOGIN` 수신
- Google Sign-In SDK / Kakao SDK 실행
- ID Token 획득
- `SOCIAL_LOGIN_RESULT` postMessage로 웹에 전달

### 백엔드
- ID Token 서명, iss, aud, exp, nonce 검증 (JWKS 로컬 검증)
- `provider + sub` 기준 회원 조회 / 자동 생성
- SayNow access token (30분) + refresh token (14일) 발급
- refresh token은 hash만 저장, 재발급 시 회전
- 로그아웃 시 refresh token hash 폐기

---

## 4. postMessage 프로토콜

### 웹 → 앱

```json
{
  "type": "REQUEST_SOCIAL_LOGIN",
  "provider": "GOOGLE",
  "nonce": "f95f0c8c2b9d4a3c9e3e6b2e"
}
```

### 앱 → 웹

```json
{
  "type": "SOCIAL_LOGIN_RESULT",
  "provider": "GOOGLE",
  "idToken": "eyJhbGciOiJSUzI1Ni..."
}
```

---

## 5. 백엔드 API 명세

### 공통 규칙
- Base path: `/api/v1`
- 응답 envelope: `{ success, data, error }`
- 인증 필요 API: `Authorization: Bearer {accessToken}` 헤더

---

### 5.1 소셜 로그인

`POST /api/v1/auth/social-login` — 인증 불필요

**요청**
```json
{
  "provider": "GOOGLE",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9...",
  "nonce": "f95f0c8c2b9d4a3c9e3e6b2e"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `provider` | string | O | `GOOGLE`, `KAKAO` |
| `idToken` | string | O | provider가 발급한 OIDC ID Token |
| `nonce` | string | O | 앱이 로그인 요청에 사용한 nonce |

**성공 응답**
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
      "provider": "GOOGLE",
      "newMember": true
    }
  },
  "error": null
}
```

---

### 5.2 토큰 재발급

`POST /api/v1/auth/token/refresh` — 인증 불필요

**요청**
```json
{
  "refreshToken": "saynow-refresh-token"
}
```

**성공 응답**
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

처리 규칙.
- refresh token hash를 DB에서 찾는다.
- 만료·폐기·재사용 여부 확인.
- 유효하면 기존 token 폐기 후 새 token 발급 (회전).

---

### 5.3 로그아웃

`POST /api/v1/auth/logout` — 인증 불필요

**요청**
```json
{
  "refreshToken": "saynow-refresh-token"
}
```

**성공 응답**
```json
{
  "success": true,
  "data": null,
  "error": null
}
```

처리 규칙.
- 이미 폐기됐거나 존재하지 않아도 멱등 성공으로 처리한다.
- 앱은 응답 성공 여부와 무관하게 로컬 토큰을 삭제한다.

---

## 6. 에러 코드

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "OIDC_TOKEN_INVALID",
    "message": "소셜 로그인 토큰이 올바르지 않습니다."
  }
}
```

| HTTP | code | message |
|------|------|---------|
| 400 | `UNSUPPORTED_SOCIAL_PROVIDER` | 지원하지 않는 소셜 로그인 제공자입니다. |
| 400 | `OIDC_TOKEN_INVALID` | 소셜 로그인 토큰이 올바르지 않습니다. |
| 400 | `OIDC_NONCE_MISMATCH` | 소셜 로그인 요청 검증 값이 일치하지 않습니다. |
| 401 | `AUTH_REQUIRED` | 인증이 필요합니다. |
| 401 | `ACCESS_TOKEN_EXPIRED` | 인증 토큰이 만료됐습니다. |
| 401 | `REFRESH_TOKEN_INVALID` | 재발급 토큰이 올바르지 않습니다. |
| 403 | `SESSION_ACCESS_DENIED` | 접근할 수 없는 세션입니다. |
| 409 | `SOCIAL_ACCOUNT_CONFLICT` | 이미 다른 계정에 연결된 소셜 계정입니다. |
| 503 | `OIDC_PROVIDER_UNAVAILABLE` | 소셜 로그인 제공자 검증에 실패했습니다. |

---

## 7. API 권한 정책

| API | 인증 정책 |
|-----|---------|
| `POST /api/v1/auth/social-login` | 공개 |
| `POST /api/v1/auth/token/refresh` | 공개 |
| `POST /api/v1/auth/logout` | 공개 |
| `GET /api/v1/categories` | 공개 |
| `GET /api/v1/scenarios`, `GET /api/v1/scenarios/{id}` | 공개 |
| `POST /api/v1/sessions` | 로그인 필수 |
| `GET /api/v1/sessions/{id}` | 로그인 필수 · 본인 세션만 |
| `PUT /api/v1/sessions/{id}/micReady` | 로그인 필수 · 본인 세션만 |
| `POST /api/v1/sessions/{id}/turns` | 로그인 필수 · 본인 세션만 |
| `POST /api/v1/sessions/{id}/exit` | 로그인 필수 · 본인 세션만 |
| `GET /api/v1/sessions/{id}/feedback` | 로그인 필수 · 본인 세션만 |

---

## 8. Provider별 설정

### Google

| 항목 | 값 |
|------|-----|
| Issuer | `https://accounts.google.com` |
| JWKS URI | `https://www.googleapis.com/oauth2/v3/certs` |
| 서명 알고리즘 | RS256 |
| 계정 식별자 | ID Token의 `sub` |
| scope | `openid email` |

### Kakao

| 항목 | 값 |
|------|-----|
| Issuer | `https://kauth.kakao.com` |
| JWKS URI | `https://kauth.kakao.com/.well-known/jwks.json` |
| 서명 알고리즘 | RS256 |
| 계정 식별자 | ID Token의 `sub` |
| scope | `openid email` (OpenID Connect 활성화 필수) |

---

## 9. 앱 키 발급 및 설정

앱 식별자 (app.json 기준).
- 패키지명 / 번들 ID: `com.saynow.app`

### Kakao — 백엔드 팀에 요청할 것

1. Kakao Developers 앱에 플랫폼 추가.
   - Android: 패키지명 `com.saynow.app`
   - iOS: 번들 ID `com.saynow.app`
2. 카카오 로그인 활성화 확인.
3. **OpenID Connect 활성화** 확인 (없으면 ID Token 발급 불가).
4. **네이티브 앱 키** 공유 (REST API 키 아님).

### Google — 백엔드 팀에 요청할 것

1. Google Cloud Console 동일 프로젝트에서 OAuth 클라이언트 ID 추가 생성.
   - Android용: 패키지명 `com.saynow.app` + SHA-1 지문 (개발 중엔 디버그 키)
   - iOS용: 번들 ID `com.saynow.app`
2. **Web 클라이언트 ID** 공유 (앱 코드에 설정, ID Token의 `aud` 값이 됨).

> 앱과 백엔드가 **같은 프로젝트의 클라이언트 ID**를 사용해야 한다. 따로 발급하면 `aud` 불일치로 토큰 검증 실패.

---

## 10. 데이터 모델

### members

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGINT PK | 회원 ID |
| `nickname` | VARCHAR(100) NULL | 표시 이름 |
| `email` | VARCHAR(255) NULL | provider 이메일 (보조 정보) |
| `created_at` | TIMESTAMP(6) | 생성 시각 |
| `updated_at` | TIMESTAMP(6) | 수정 시각 |

### social_accounts

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGINT PK | 소셜 계정 ID |
| `member_id` | BIGINT FK | SayNow 회원 ID |
| `provider` | VARCHAR(20) | `GOOGLE`, `KAKAO` |
| `provider_subject` | VARCHAR(255) | OIDC `sub` — 계정 식별 기준 |
| `email` | VARCHAR(255) NULL | provider 이메일 |
| `email_verified` | BOOLEAN NULL | 이메일 검증 여부 |
| `nickname` | VARCHAR(100) NULL | provider 닉네임 |
| `created_at` | TIMESTAMP(6) | 생성 시각 |
| `updated_at` | TIMESTAMP(6) | 수정 시각 |

UNIQUE (provider, provider_subject).

### refresh_tokens

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGINT PK | refresh token ID |
| `member_id` | BIGINT FK | 회원 ID |
| `token_hash` | VARCHAR(255) UNIQUE | refresh token hash (원문 미저장) |
| `expires_at` | TIMESTAMP(6) | 만료 시각 |
| `revoked_at` | TIMESTAMP(6) NULL | 폐기 시각 |
| `created_at` | TIMESTAMP(6) | 생성 시각 |
| `updated_at` | TIMESTAMP(6) | 수정 시각 |

### practice_sessions 변경

`member_id BIGINT FK NOT NULL` 컬럼 추가. 세션은 반드시 회원에게 귀속된다.

---

## 11. 프론트엔드 구현 파일

| 파일 | 역할 |
|------|------|
| `apps/web/src/app/login/page.tsx` | 로그인 페이지 UI (카카오/구글 버튼) |
| `apps/web/src/store/authStore.ts` | 토큰·회원 정보 Zustand store (refreshToken localStorage persist) |
| `apps/web/src/hooks/useLoginBridge.ts` | 네이티브 postMessage 수신·발신 훅 |
| `apps/web/src/lib/api.ts` | Authorization 헤더 자동 첨부, 401 시 refresh 처리, auth API 함수 |

---

## 12. MVP 이후 보류 항목

- refresh token HttpOnly Secure Cookie 전환
- provider access token 저장
- 소셜 계정 연결·해제
- 회원 탈퇴 시 provider unlink
- Google Workspace 도메인 제한
- 관리자 강제 로그아웃
