# Amplitude 이벤트 플랜

- **최종 수정**: 2026-06-22
- **최종 수정자**: 김준서

---

## dev/prod 환경 구분

`AmplitudeProvider`에서 `process.env.NODE_ENV`로 자동 판별.

| 환경 | NODE_ENV | environment 값 |
|------|----------|---------------|
| 로컬 개발 (`npm run dev`) | `development` | `dev` |
| Vercel 배포 빌드 | `production` | `prod` |

Amplitude 대시보드 필터: `environment = prod` → 실제 유저 데이터만 조회.

---

## 퍼널 정의

### 온보딩 (Activation)
> "핵심 가치를 처음 경험하는 것"까지. **첫 시나리오 완료**가 온보딩 종료 기준.

```
App Opened
    ↓
Login Completed
    ↓
Onboarding Started
    ↓
Onboarding Step Completed × 4 (intro → sound → mic → scenario)
    ↓
Onboarding Completed
    ↓
Conversation Completed    ← 여기까지가 온보딩 완료
    ↓
Feedback Summary Viewed   ← 핵심 가치 경험
```

### 리텐션 (Retention)
```
Scenario List Viewed (두 번째 방문)
    ↓
Scenario Started (두 번째 시나리오)   ← 진짜 리텐션 지표
    ↓
Conversation Completed
    ↓
Scenario Started (세 번째 시나리오)
    ↓
All Scenarios Completed
```

---

## 이벤트 목록

> 네이밍 규칙: 이벤트 `Title Case + 과거형`, 속성 `snake_case`
> 상수 관리: `apps/web/src/lib/analytics/events.ts`

### 진입

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `App Opened` | 앱 최초 로드 시 1회 (AmplitudeProvider 초기화 직후) | — |
| `Scenario List Viewed` | 홈(시나리오 목록) 페이지 진입 | — |

### 인증

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Login Started` | 로그인 버튼 클릭 | `provider` (`kakao`\|`google`) |
| `Login Completed` | OAuth 콜백 성공 | `provider` |

### 온보딩

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Onboarding Started` | 온보딩 페이지 진입 | — |
| `Onboarding Step Completed` | 각 스텝 "다음" 클릭 | `step_name` (`intro`\|`sound`\|`mic`) |
| `Microphone Permission Prompted` | 마이크 권한 요청 시작 | — |
| `Microphone Permission Granted` | 마이크 권한 허용 | — |
| `Microphone Permission Denied` | 마이크 권한 거부 | — |
| `Onboarding Completed` | 시나리오 스텝 "시작할게요!" 클릭 | — |

> `Onboarding Scenario Tapped` 미구현 — ScenarioStep이 카드 선택 없이 단일 버튼 구조라 해당 없음.

### 홈 (시나리오 목록)

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Scenario Started` | 시작/다시 시작 버튼 클릭 | `scenario_id`, `is_retry` |
| `Scenario Locked Tapped` | 잠긴 시나리오 탭 | `scenario_id`, `lock_reason` |
| `My Page Viewed` | 내 정보 버튼 클릭 | — |
| `All Scenarios Completed` | 3개 시나리오 모두 완료 화면 최초 도달 | — |

### 대화

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Conversation Started` | 세션 API 성공 (첫 AI 질문 수신) | `scenario_id`, `session_id` |
| `Turn Completed` | 발화 제출 완료 (AI 응답 수신) | `scenario_id`, `session_id`, `turn_index`, `stt_engine` (`native`\|`web`\|`deepgram`) |
| `Recording Cancelled` | 녹음 중 취소 버튼 클릭 | `scenario_id`, `session_id`, `stt_engine` |
| `Empty Recording Submitted` | 빈 음성 토스트 노출 | `scenario_id`, `session_id` |
| `Conversation Completed` | 모든 턴 완료 (결과 보기 버튼 등장) | `scenario_id`, `session_id` |
| `Conversation Abandoned` | 나가기 모달에서 나가기 확인 | `scenario_id`, `session_id` |

### 피드백

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Feedback Summary Viewed` | 총평 페이지 진입 | `scenario_id`, `session_id`, `score` |
| `Feedback Detail Viewed` | 상세 분석 진입 | `scenario_id`, `session_id` |
| `Feedback Turn Navigated` | 발화별 카드 스와이프 | `scenario_id`, `session_id`, `turn_index` |
| `Feedback Exited Early` | 상세 분석 안 보고 총평에서 나감 | `scenario_id`, `session_id` |

---

## 유저 속성 (User Properties)

세그먼트 필터링용. 앱 초기 진입 시 `AmplitudeProvider`에서 설정.

| 속성 | 타입 | 값 | 용도 |
|------|------|----|------|
| `platform` | `string` | `'ios'`\|`'android'`\|`'web'` | 플랫폼별 완료율·이탈률 비교 |
| `app_version` | `string` | 네이티브 버전명 (웹 미설정) | 버전별 버그 추적 |
| `environment` | `string` | `'dev'`\|`'prod'` | 개발/운영 데이터 분리 |

---

## 상수 파일 구조

```ts
// apps/web/src/lib/analytics/events.ts
export const EVENTS = {
  // 진입
  APP_OPENED: 'App Opened',
  SCENARIO_LIST_VIEWED: 'Scenario List Viewed',

  // 인증
  LOGIN_STARTED: 'Login Started',
  LOGIN_COMPLETED: 'Login Completed',

  // 온보딩
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_SCENARIO_TAPPED: 'Onboarding Scenario Tapped', // 상수 존재, 미발화
  MICROPHONE_PERMISSION_PROMPTED: 'Microphone Permission Prompted',
  MICROPHONE_PERMISSION_GRANTED: 'Microphone Permission Granted',
  MICROPHONE_PERMISSION_DENIED: 'Microphone Permission Denied',
  ONBOARDING_COMPLETED: 'Onboarding Completed',

  // 홈
  SCENARIO_STARTED: 'Scenario Started',
  SCENARIO_LOCKED_TAPPED: 'Scenario Locked Tapped',
  MY_PAGE_VIEWED: 'My Page Viewed',
  ALL_SCENARIOS_COMPLETED: 'All Scenarios Completed',

  // 대화
  CONVERSATION_STARTED: 'Conversation Started',
  TURN_COMPLETED: 'Turn Completed',
  RECORDING_CANCELLED: 'Recording Cancelled',
  EMPTY_RECORDING_SUBMITTED: 'Empty Recording Submitted',
  CONVERSATION_COMPLETED: 'Conversation Completed',
  CONVERSATION_ABANDONED: 'Conversation Abandoned',

  // 피드백
  FEEDBACK_SUMMARY_VIEWED: 'Feedback Summary Viewed',
  FEEDBACK_DETAIL_VIEWED: 'Feedback Detail Viewed',
  FEEDBACK_TURN_NAVIGATED: 'Feedback Turn Navigated',
  FEEDBACK_EXITED_EARLY: 'Feedback Exited Early',
} as const;

export const USER_PROPERTIES = {
  PLATFORM: 'platform',
  APP_VERSION: 'app_version',
  ENVIRONMENT: 'environment',
} as const;
```

---

## 이벤트 수

| 카테고리 | 이벤트 수 |
|---------|---------|
| 진입 | 2 |
| 인증 | 2 |
| 온보딩 | 6 |
| 홈 | 4 |
| 대화 | 6 |
| 피드백 | 4 |
| **합계** | **24** |
