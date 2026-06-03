# SayNow 릴리즈 노트

---

## v1.0.0 (versionCode 1) — 2026년 5월 초
> 첫 번째 플레이스토어 심사 제출 버전 (브랜치: `mvp`)

### 주요 기능
- **소셜 로그인** — 카카오 / 구글 네이티브 SDK 로그인, 웹 브릿지 연동
- **시나리오 목록** — 카테고리 필터, 잠금/해제 상태, 시나리오 상세 모달
- **대화 시뮬레이션** — 네이티브 STT 음성 인식 + TTS 외국인 대사 자동 재생
- **AI 피드백** — 대화 완료 후 이해도 점수, 표현 개선 제안
- **하트 시스템** — 부적절한 응답 시 하트 차감, 햅틱 피드백
- **정책 페이지** — 심사용 개인정보처리방침 / 이용약관 공개 페이지
- **계정 관리** — 마이 페이지에서 로그아웃 / 계정 탈퇴

### 인프라 / 네이티브
- WebView ↔ 네이티브 postMessage 브릿지 구조 확립 (STT, TTS, 햅틱, 로그인, 뒤로가기, 앱 종료)
- expo-speech-recognition 기반 네이티브 STT 연동
- EAS Build 설정 (development / preview / production)
- Vercel Analytics 추가

### 코드 구조
- API 호출을 도메인별 모듈로 분리 (`lib/api/`)
- 화면 데이터 로딩을 TanStack Query 훅으로 이전
- WebView 송수신 유틸 중앙화 (`lib/bridge`)
- MSW 개발용 mock 핸들러 세팅

---

## v1.1.0 (versionCode 2) — 2026년 5월 말
> 두 번째 플레이스토어 심사 제출 버전 (브랜치: `mvp2`)

### 신규 기능
- **AI 가이드 모드** — 대화 중 막히는 순간 질문/답변 힌트를 받는 가이드 모드
- **브리핑 화면** — 시나리오 시작 전 상황 설명과 목표를 확인하는 화면
- **시나리오 배경 이미지** — 상황별 배경 이미지 적용 (공항, 카페 등), webp 전환
- **대화 중 상황 다시 보기** — 진행 중 시나리오 상황 다시 확인 가능
- **만족도 평가 (NPS)** — 연습 완료 후 홈 진입 시 만족도 팝업 표시
- **Meta Ads SDK 연동** — 인스타그램 광고 전환 추적용 Facebook SDK 초기화
- **STT 인식률 실험실** — 마이 페이지에서 접근 가능한 내부 STT 품질 측정 도구
- **STT 브릿지 확장** — contextualStrings / languageModel 옵션을 웹에서 제어 가능

### UX/디자인 개선
- 홈·로그인·마이페이지 fade-in 전환 애니메이션
- 브리핑 → 대화 화면 fade 전환 (배경 이미지 연속성 유지)
- 공통 Button 컴포넌트 — 3D 눌림 효과 통일
- 스켈레톤 shimmer 애니메이션 (animate-pulse → 좌우 흐르는 흰빛 효과)
- 피드백 로딩 화면 → 진행 바(progress bar) UI로 교체
- 피드백 페이지 순차 등장 애니메이션
- 뱃지 잠금 해제 shimmer / unlock 애니메이션
- 대화 화면 하트 손실 피드백 (빨간 테두리 플래시 + 햅틱)
- 가이드 모드 말풍선 레이블 한글화 (질문 / 답변)
- 노치·펀치홀 기기 safe-area-inset-top 대응
- 로그인 페이지 타이핑 애니메이션 및 최근 로그인 provider 뱃지
- 모바일 앱 레이아웃 max-w-[430px] 래퍼 적용 (웹 브라우저에서도 앱처럼 표시)

### 버그 수정
- STT 음성 인식 결과 누락 / 중복 누적 버그 수정
- STT 실험실 모바일 멈춤 및 결과 저장 안 되는 문제 수정
- NPS 제출 시 sessionId null 버그 수정
- 가이드 모드 키보드 올라올 때 input 가려지는 문제 수정
- 피드백 API 401 오류 (SSE → HTTP 롤백)
- 로그인 유지 race condition 해결 (injectedJavaScriptBeforeContentLoaded 토큰 선주입)
- EXIT_APP 브릿지 핸들러 누락으로 앱 종료 안 되던 문제 수정
- TypingDots 중복 표시 문제 수정
- 피드백 onDone 두 번 호출 문제 수정
- useTypingLoop enabled deps 누락으로 루프 제어 안 되던 문제 수정
- 시나리오 선택 페이지 스크롤 타이머 cleanup 누락 수정
- prefetch 실패 시 캐시된 rejected Promise가 재사용되는 문제 수정

### 성능 개선
- 시나리오 쿼리를 Zustand hydration 직후 시작해 스켈레톤 노출 시간 단축
- 대화 시작 시 세션 API 선제 호출로 첫 로딩 단축
- 마지막 답변 후 피드백 백그라운드 prefetch
- 시나리오 이미지 webp 전환 및 뱃지 탭 시 preload

### 코드 구조
- 피드백 API SSE 스트리밍 방식으로 전환 (useFeedbackStream 훅)
- 채팅 컴포넌트 공통화 (AiBubble, UserBubble, TypingDots 분리)
- 인증 가드를 useRequireAuth 훅으로 추출
- TTS stop() 캡슐화 (useTts 훅)
