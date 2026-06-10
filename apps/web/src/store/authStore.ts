// 인증 상태 및 토큰 관리 Zustand store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthMember {
  userId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newUser: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  member: AuthMember | null;
  _hasHydrated: boolean;
  setAuth: (accessToken: string, refreshToken: string, member: AuthMember) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      member: null,
      _hasHydrated: false,
      setAuth: (accessToken, refreshToken, member) =>
        set({ accessToken, refreshToken, member }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, member: null }),
    }),
    {
      name: 'landit-auth',
      // refreshToken만 localStorage에 유지, accessToken은 메모리에서 관리
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        member: state.member,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) return;
        state?.setHasHydrated(true);
        if (!state) useAuthStore.getState().setHasHydrated(true);
      },
    }
  )
);
