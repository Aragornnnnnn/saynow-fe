# 가이드 모드 구현 체크리스트

## 개요
대화 중 GUIDE 버튼으로 가이드 모드를 켜고, 한국어 질문을 입력해 AI에게 영어 학습 설명을 받는 기능.
기본 화면(마이크)은 그대로 유지 — GUIDE 버튼 탭 시 하단만 파란 입력창으로 교체.

---

## 작업 목록

### 1단계 — API 추가
- [x] `apps/web/src/lib/api/sessions.ts`에 `askGuide(sessionId, question)` 함수 추가

### 2단계 — 타입 확장
- [x] `conversation/[id]/page.tsx`의 `ChatMessage` role에 `'guide-q' | 'guide-a'` 추가

### 3단계 — 말풍선 컴포넌트
- [x] `apps/web/src/components/chat/GuideQBubble.tsx` 생성 — 사용자 가이드 질문 말풍선 (우측, 파란 색상)
- [x] `apps/web/src/components/chat/GuideABubble.tsx` 생성 — AI 가이드 답변 말풍선 (좌측, 파란 색상 + 내부 GUIDE 레이블)

### 4단계 — 하단 UI (GUIDE 버튼 토글 방식)
- [x] 마이크 버튼 우상단에 작은 `GUIDE` 버튼 추가
- [x] `isGuideMode` state — GUIDE 탭 시 true, ✕ 또는 전송 후 false
- [x] 가이드 모드일 때 하단 전체가 파란 입력창으로 교체
- [x] `isGuideLoading` state — 전송 중 버튼 disabled 처리
- [x] Enter 키 전송 지원

### 5단계 — 핸들러 연결
- [x] `handleGuideSubmit` — 입력값 전송 → `askGuide` 호출 → guide-q/guide-a 메시지 추가
- [x] 전송 후 자동으로 가이드 모드 닫힘 (마이크 화면으로 복귀)

### 6단계 — 말풍선 렌더링 연결
- [x] `messages.map` 분기에 `guide-q` → `GuideQBubble`, `guide-a` → `GuideABubble` 추가

---

## 말풍선 role 정의

| role | 설명 | 위치 |
|------|------|------|
| `ai` | 시나리오 AI 질문 | 좌측 |
| `user` | 사용자 영어 답변 | 우측 |
| `guide-q` | 사용자 가이드 질문 | 우측 |
| `guide-a` | AI 가이드 답변 | 좌측 |
