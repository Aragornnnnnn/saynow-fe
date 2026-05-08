// 앱 전역 상태 — 네이티브 환경 정보, 권한 상태 관리
import { create } from 'zustand';

interface AppState {
  micPermission: 'unknown' | 'granted' | 'denied';
  setMicPermission: (status: 'granted' | 'denied') => void;
}

export const useAppStore = create<AppState>((set) => ({
  micPermission: 'unknown',
  setMicPermission: (status) => set({ micPermission: status }),
}));
