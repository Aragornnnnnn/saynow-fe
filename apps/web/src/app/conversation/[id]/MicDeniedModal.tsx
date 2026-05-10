// 마이크 권한 거부 시 표시되는 안내 모달
'use client';

import { openNativeSettings } from '@/bridge/commands';

interface MicDeniedModalProps {
  isNative: boolean;
  onClose: () => void;
}

export default function MicDeniedModal({ isNative, onClose }: MicDeniedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="mx-6 w-full max-w-sm rounded-2xl bg-card px-6 py-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-foreground mb-2">마이크 권한이 필요해요</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          영어 회화 연습을 위해 마이크 접근 권한이 필요해요. 설정에서 권한을 허용해주세요.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground"
          >
            닫기
          </button>
          {isNative && (
            <button
              onClick={() => {
                onClose();
                openNativeSettings();
              }}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white"
            >
              설정으로 이동
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
