# SayNow

실제 외국인 상황을 시뮬레이션하며 영어 회화를 연습하고, AI가 외국인 관점의 이해도 피드백을 주는 서비스.

## 주요 기능

- **시나리오 선택** — 카페, 공항, 호텔, 식당, 택시 등 실생활 상황별 시나리오 제공, 난이도 선택 가능
- **대화 연습** — 외국인 AI가 TTS로 질문하고, 사용자가 음성으로 답변
- **이해도 피드백** — 외국인 귀에 어떻게 들렸는지, 더 나은 표현은 무엇인지 AI가 분석

## 화면 구성

| 경로 | 설명 |
| --- | --- |
| `/` | 시나리오 선택 |
| `/conversation/[id]` | 대화 |
| `/feedback/[id]` | 피드백 결과 |

## 기술 스택

**앱 구성**

| 영역 | 기술 |
| --- | --- |
| Web (메인 로직) | Next.js (App Router), TanStack Query, Zustand, Tailwind CSS, shadcn/ui |
| Mobile (WebView 껍데기) | Expo (React Native), expo-av |
| 인프라 | Vercel (웹), EAS Build (앱), Supabase (DB), AWS EC2 (서버) |

**서버 구성**

| 역할 | 기술 |
| --- | --- |
| 백엔드 | Java + Spring |
| AI 서버 | Python + FastAPI |

## 레포 구조

```
saynow-fe/
  apps/
    web/     # Next.js — UI 및 비즈니스 로직
    mobile/  # Expo — WebView 서빙
  docs/      # 아키텍처, 기획 문서
```

`apps/mobile`은 WebView 껍데기로, 실제 로직은 `apps/web`에만 작성한다.

## 시작하기

**패키지 설치**

```bash
npm install
```

**환경변수 설정**

```bash
cp apps/web/.env.example apps/web/.env.local
```

`.env.local`에서 백엔드 서버 주소를 설정한다.

**개발 서버 실행**

```bash
# 웹
npm run dev -w apps/web

# 모바일 (Expo)
npm run start -w apps/mobile
```

## 웹뷰 ↔ 네이티브 통신

마이크 녹음은 네이티브(`expo-av`)에서 처리하고, `postMessage`로 웹에 전달한다. 웹이 음성 파일을 AI 서버로 전송해 STT 및 피드백을 받는다.

```
웹(버튼 클릭) → postMessage → 네이티브 녹음 시작
→ 녹음 완료 → 음성 파일 postMessage → 웹 → AI 서버
```

## 문서

- [아키텍처](docs/architecture.md)
- [기술 스택](docs/tech-stack.md)
- [기획](docs/planning.md)
