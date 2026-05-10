import * as SecureStore from 'expo-secure-store';
import type { NativeAuthSession } from './mobileApi';

const AUTH_SESSION_KEY = 'saynow-native-auth';

export async function loadAuthSession(): Promise<NativeAuthSession | null> {
  const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as NativeAuthSession;
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function saveAuthSession(session: NativeAuthSession) {
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}
