// 인증 상태 및 토큰 관리 Zustand store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthMember {
  memberId: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  newMember: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  member: AuthMember | null;
  _hasHydrated: boolean;
  setAuth: (accessToken: string, refreshToken: string, member: AuthMember) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      member: null,
      _hasHydrated: false,
      setAuth: (accessToken, refreshToken, member) =>
        set({ accessToken, refreshToken, member }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, member: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'saynow-auth',
      // refreshToken만 localStorage에 유지, accessToken은 메모리에서 관리
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        member: state.member,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
