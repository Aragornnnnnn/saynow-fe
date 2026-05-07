# Architecture

## 레포 구조

pnpm workspaces 기반 모노레포.

```
saynow-fe/
  apps/
    mobile/   # React Native (Expo) — 웹뷰 껍데기
    web/      # Next.js — 실제 앱 로직
  docs/
  package.json
  pnpm-workspace.yaml
```

## 앱 구성

### mobile (Expo)
웹뷰 서빙이 주 역할. 네이티브 기능이 필요한 경우에만 브릿징 사용.

네이티브에서 처리하는 것:
- 마이크 녹음 (`expo-av`)
- 권한 요청 (마이크)

### web (Next.js App Router)
실제 UI와 비즈니스 로직 전담. 기술 스택 상세는 [tech-stack.md](tech-stack.md) 참고.

## 웹뷰 ↔ 네이티브 통신

`postMessage` 방식 사용.

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
apps/mobile/.env.local  # 모바일 환경변수
```

## 미결 사항

- 인증/세션 방식 (Supabase Auth vs 백엔드 처리)
- 브랜치 컨벤션
