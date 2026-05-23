// 인증 필요 페이지에서 미인증 시 /login으로 리다이렉트하는 훅
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useRequireAuth() {
  const router = useRouter();
  const { accessToken, refreshToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !accessToken && !refreshToken) {
      router.replace('/login');
    }
  }, [_hasHydrated, accessToken, refreshToken, router]);

  return { isReady: _hasHydrated && (!!accessToken || !!refreshToken) };
}
