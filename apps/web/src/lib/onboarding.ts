import type { AuthMember } from '@/store/authStore';

const ONBOARDING_COMPLETE_PREFIX = 'landit-onboarding-complete';

function getOnboardingCompleteKey(userId: string) {
  return `${ONBOARDING_COMPLETE_PREFIX}:${userId}`;
}

export function hasCompletedOnboarding(userId: string) {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getOnboardingCompleteKey(userId)) === 'true';
}

export function shouldShowOnboarding(member: AuthMember | null) {
  return !!member?.newUser && !hasCompletedOnboarding(member.userId);
}

export function markOnboardingComplete(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getOnboardingCompleteKey(userId), 'true');
}
