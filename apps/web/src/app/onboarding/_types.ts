// 온보딩 공유 타입 및 상수
export type OnboardingStep = 'intro' | 'sound' | 'mic' | 'thought' | 'scenario';
export type MicPermissionState = 'idle' | 'requesting' | 'denied';
export type PermissionPreviewPlatform = 'ios' | 'android';

export const STEP_ORDER: OnboardingStep[] = ['intro', 'sound', 'mic', 'thought', 'scenario'];
export const FALLBACK_QUESTION = 'Hey! Can you hear me alright?';
export const FALLBACK_TRANSLATED_QUESTION = '잘 들려요?';
export const SOUND_QUESTIONS = [
  'Hey! Can you hear me alright?',
  "Hi there! How's it going?",
  'Greetings! How are you doing today?',
  'Hello! Can you hear me clearly?',
  'Hi! Is my voice coming through okay?',
];
export const CHAT_PREVIEW_MESSAGES = [
  { role: 'ai', text: 'What food do you like?' },
  { role: 'user', text: 'I like pizza.' },
  { role: 'ai', text: 'Nice. Why do you like it?' },
] as const;
