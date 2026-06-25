// Amplitude 이벤트명·속성 키 상수 — 하드코딩 방지 및 플랫폼 간 일관성 유지

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
  ONBOARDING_SCENARIO_TAPPED: 'Onboarding Scenario Tapped',
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

  // 의견 보내기 (만족도)
  OPINION_SHEET_OPENED: 'Opinion Sheet Opened',
  OPINION_SUBMITTED: 'Opinion Submitted',

  // 계정
  LOGOUT_COMPLETED: 'Logout Completed',
  ACCOUNT_DELETION_COMPLETED: 'Account Deletion Completed',
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
  HAS_COMMENT: 'has_comment',
} as const;

export const USER_PROPERTIES = {
  PLATFORM: 'platform',
  APP_VERSION: 'app_version',
  ENVIRONMENT: 'environment',
} as const;
