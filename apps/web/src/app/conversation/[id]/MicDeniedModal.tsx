// 마이크 권한 거부 시 표시되는 안내 모달
'use client';

import { openNativeSettings } from '@/bridge/commands';
import { Button } from '@/components/ui/Button';

interface MicDeniedModalProps {
  isNative: boolean;
  onClose: () => void;
}

export default function MicDeniedModal({ isNative, onClose }: MicDeniedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="mx-6 w-full max-w-sm rounded-3xl bg-card px-6 pb-8 pt-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 text-base font-bold text-foreground">마이크를 켜야 대화할 수 있어요</h2>

        {isNative && (
          <div className="mb-5 rounded-2xl bg-[#F5F5F3] px-4 py-4 space-y-2">
            {[
              { step: '1', text: "아래 버튼을 눌러 설정을 열어요" },
              { step: '2', text: "권한 → 마이크로 이동해요" },
              { step: '3', text: "'허용'을 선택해주세요" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {step}
                </span>
                <span className="text-sm text-foreground">{text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={onClose}>닫기</Button>
          {isNative && (
            <Button size="md" onClick={() => { onClose(); openNativeSettings(); }}>
              설정 열기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
