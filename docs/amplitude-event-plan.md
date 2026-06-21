# Amplitude 이벤트 플랜

- **최종 수정**: 2026-06-22
- **최종 수정자**: 김준서

---

## 퍼널 정의

### 온보딩 (Activation)
> "핵심 가치를 처음 경험하는 것"까지. 4단계 스텝 완료가 아니라 **첫 시나리오 완료**가 온보딩 종료 기준.

```
Login Completed
    ↓
Onboarding Started
    ↓
Onboarding Step Completed × 4 (intro → mic → sound → scenario)
    ↓
Onboarding Completed
    ↓
Scenario Started          ← 첫 시나리오
    ↓
Conversation Completed    ← 여기까지가 온보딩 완료
    ↓
Feedback Summary Viewed   ← 핵심 가치 경험
```

### 리텐션 (Retention)
```
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

### 인증

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Login Started` | 로그인 버튼 클릭 | `provider` (`kakao`\|`google`) |
| `Login Completed` | OAuth 콜백 성공 | `provider` |

### 온보딩

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Onboarding Started` | 온보딩 페이지 진입 | — |
| `Onboarding Step Completed` | 각 스텝 "다음" 클릭 | `step_name` (`intro`\|`mic`\|`sound`\|`scenario`) |
| `Onboarding Scenario Tapped` | 온보딩 시나리오 스텝에서 카드 탭 | `scenario_id` |
| `Microphone Permission Prompted` | 마이크 권한 팝업 노출 | — |
| `Microphone Permission Granted` | 마이크 권한 허용 | — |
| `Microphone Permission Denied` | 마이크 권한 거부 | — |
| `Onboarding Completed` | 온보딩 마지막 스텝 완료 | — |

### 홈

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Scenario Started` | 시작/다시 시작 버튼 클릭 | `scenario_id`, `is_retry` |
| `Scenario Locked Tapped` | 잠긴 시나리오 탭 | `scenario_id`, `lock_reason` (`LOCKED`\|`COMING_SOON`) |
| `My Page Viewed` | 내 정보 버튼 클릭 | — |

### 대화

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Conversation Started` | 세션 API 성공 (첫 AI 질문 수신) | `scenario_id`, `session_id` |
| `Turn Completed` | 발화 제출 완료 (AI 응답 수신) | `scenario_id`, `session_id`, `turn_index`, `stt_engine` (`native`\|`web`\|`deepgram`) |
| `Recording Cancelled` | 녹음 중 취소 버튼 클릭 | `scenario_id`, `turn_index` |
| `Empty Recording Submitted` | 빈 음성 토스트 노출 | `scenario_id`, `turn_index` |
| `Conversation Completed` | 모든 턴 완료 (결과 보기 버튼 등장) | `scenario_id`, `session_id`, `turn_count` |
| `Conversation Abandoned` | 나가기 모달에서 나가기 확인 | `scenario_id`, `session_id`, `turn_count` |

### 피드백

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `Feedback Summary Viewed` | 총평 페이지 진입 | `scenario_id`, `session_id`, `score` |
| `Feedback Detail Viewed` | 상세 분석 진입 | `scenario_id`, `session_id` |
| `Feedback Turn Navigated` | 발화별 카드 스와이프 | `scenario_id`, `turn_index`, `feedback_type` (`GOOD`\|`IMPROVE`) |
| `Feedback Exited Early` | 상세 분석 안 보고 총평에서 나감 | `scenario_id`, `session_id`, `score` |

### 완료

| 이벤트 | 발화 시점 | 속성 |
|--------|-----------|------|
| `All Scenarios Completed` | 3개 시나리오 모두 완료 화면 도달 | — |

---

## 유저 속성 (User Properties)

세그먼트 필터링용. 이벤트 발화 시점에 함께 업데이트.

| 속성 | 타입 | 업데이트 시점 | 용도 |
|------|------|--------------|------|
| `platform` | `string` | 앱 초기 진입 시 1회 | `'ios'`\|`'android'`\|`'web'` — 플랫폼별 완료율·이탈률 비교 |
| `app_version` | `string` | 앱 초기 진입 시 1회 | 네이티브 앱 버전 (웹은 미설정) — 버전별 버그 추적 |

---

## 상수 파일 구조

```ts
// apps/web/src/lib/analytics/events.ts
export const EVENTS = {
  // 인증
  LOGIN_STARTED: 'Login Started',
  LOGIN_COMPLETED: 'Login Completed',

  // 온보딩
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_SCENARIO_TAPPED: 'Onboarding Scenario Tapped',
  MICROPHONE_PERMISSION_PROMPTED: 'Microphone Permission Prompted',
  MICROPHONE_PERMISSION_GRANTED: 'Microphone Permission Granted',
  MICROPHONE_PERMISSION_DENIED: 'Microphone Permission Denied',
  ONBOARDING_COMPLETED: 'Onboarding Completed',

  // 홈
  SCENARIO_STARTED: 'Scenario Started',
  SCENARIO_LOCKED_TAPPED: 'Scenario Locked Tapped',
  MY_PAGE_VIEWED: 'My Page Viewed',

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

  // 완료
  ALL_SCENARIOS_COMPLETED: 'All Scenarios Completed',
} as const;

export const PROPERTIES = {
  PROVIDER: 'provider',
  STEP_NAME: 'step_name',
  SCENARIO_ID: 'scenario_id',
  SESSION_ID: 'session_id',
  IS_RETRY: 'is_retry',
  LOCK_REASON: 'lock_reason',
  TURN_INDEX: 'turn_index',
  TURN_COUNT: 'turn_count',
  STT_ENGINE: 'stt_engine',
  SCORE: 'score',
  FEEDBACK_TYPE: 'feedback_type',
} as const;

export const USER_PROPERTIES = {
  PLATFORM: 'platform',
  APP_VERSION: 'app_version',
} as const;
```

---

## 이벤트 수

| 카테고리 | 이벤트 수 |
|---------|---------|
| 인증 | 2 |
| 온보딩 | 7 |
| 홈 | 3 |
| 대화 | 6 |
| 피드백 | 4 |
| 완료 | 1 |
| **합계** | **23** |
