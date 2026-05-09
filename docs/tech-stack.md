# Tech Stack

## Mobile (`apps/mobile`)

| 라이브러리 | 용도 | 선택 이유 |
| --- | --- | --- |
| Expo | React Native 프레임워크 | 설정 최소화, EAS Build 배포 편함, 네이티브 브릿징 필요시 Expo Modules로 대응 |
| react-native-webview | 웹뷰 렌더링 | 표준 라이브러리 |
| expo-av | 마이크 녹음 | 네이티브 마이크 접근 (iOS 웹뷰 마이크 제한 우회, 자연스러운 권한 UX) |

## Web (`apps/web`)

| 라이브러리 | 용도 | 선택 이유 |
| --- | --- | --- |
| Next.js (App Router) | 프레임워크 | - |
| TanStack Query | 서버 상태 관리 | 캐싱/로딩/에러 처리 자동, Next.js 궁합 좋음 |
| Zustand | 클라이언트 상태 관리 | 가볍고 보일러플레이트 없음 |
| Tailwind CSS + shadcn/ui | 스타일링 / UI 컴포넌트 | MVP 개발 속도, AI 코드 생성 품질 |
| fetch (기본) | API 통신 | Next.js App Router 캐싱 이점 |

## 인프라

| 항목 | 기술 |
| --- | --- |
| 웹 배포 | Vercel |
| 앱 빌드/배포 | EAS Build |
| DB | Supabase |
| 서버 | AWS EC2 (t3.micro), Terraform |

## 패키지 매니저

npm + npm workspaces (모노레포)

Turborepo는 미사용 — MVP 규모에서 오버헤드, 추후 필요시 추가 가능.

## 미결 사항

- 인증/세션 방식 (Supabase Auth vs 백엔드 처리)
