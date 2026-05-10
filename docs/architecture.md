# Architecture

## 레포 구조

pnpm workspaces 기반 모노레포.

```
saynow-fe/
  apps/
    mobile/   # React Native (Expo) — 네이티브 로그인 + WebView shell
    web/      # Next.js — 실제 앱 로직
  docs/
  package.json
  pnpm-workspace.yaml
```

## 앱 구성

### mobile (Expo)
네이티브 로그인, SecureStore 세션 저장, 웹뷰 서빙이 주 역할. 네이티브 기능이 필요한 경우에는 브릿지를 사용한다.

네이티브에서 처리하는 것:
- Google/Kakao 로그인
- SayNow refresh token 보관 (`expo-secure-store`)
- 마이크 녹음 (`expo-av`)
- 권한 요청 (마이크)

### web (Next.js App Router)
실제 UI와 비즈니스 로직 전담. 기술 스택 상세는 [tech-stack.md](tech-stack.md) 참고.

## 웹뷰 ↔ 네이티브 통신

`postMessage` 방식 사용.

인증 시작은 bridge로 처리하지 않는다. 앱은 네이티브 로그인 화면에서 먼저 로그인하고, 로그인 성공 후 WebView에 `saynow-auth`를 주입한다.

**마이크 녹음 플로우:**
```
웹(버튼 클릭)
  → postMessage → 네이티브 녹음 시작 (expo-av)
  → 녹음 완료 → 음성 파일을 postMessage로 웹에 전달
  → 웹에서 AI 서버로 전송 (STT + 피드백 처리)
```

## 서버 구성

| 역할 | 기술 | 담당 |
| --- | --- | --- |
| 백엔드 | Java + Spring | 상민 |
| AI 서버 | Python + FastAPI | 예원 |
| DB | Supabase | - |
| 인프라 | AWS EC2 (t3.micro), Terraform | - |

## STT 처리 위치

네이티브에서 녹음 → 음성 파일을 AI 서버로 전송 → AI 서버에서 STT 처리 (Whisper 등)

클라이언트 STT 미사용 이유: iOS 웹뷰 마이크 제한, 웹뷰 내 권한 팝업 UX 어색함

## 환경변수

```
apps/web/.env.local     # 웹 API 엔드포인트
apps/mobile/.env        # 모바일 환경변수
```

## 미결 사항

- Kakao nonce 패치 정식화
- 앱/WebView 로그아웃 동기화
- 브랜치 컨벤션
