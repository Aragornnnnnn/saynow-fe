// 온보딩 3단계 — 마이크 권한 요청
'use client';

import { Button } from '@/components/ui/Button';
import { PermissionPreview } from '../_components/PermissionPreview';
import { type MicPermissionState } from '../_types';

export function MicStep({
  micState,
  onAllow,
  onOpenSettings,
  isNative,
}: {
  micState: MicPermissionState;
  onAllow: () => void;
  onOpenSettings: () => void;
  isNative: boolean;
}) {
  const isDenied = micState === 'denied';

  return (
    <>
      <div className="flex flex-1 flex-col pt-7">
        <h1 className="text-[30px] font-black leading-[1.18] tracking-normal">
          다음으로 마이크를 켜서
          <br />
          제가 들을 수 있게 해주세요
        </h1>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-8">
          <PermissionPreview />

          {isDenied && (
            <p className="text-center text-sm font-medium leading-relaxed text-[var(--onboarding-muted)]">
              마이크 권한이 꺼져 있어요.
              <br />
              설정에서 권한을 켠 뒤 계속할 수 있어요.
            </p>
          )}
        </div>
      </div>

      {isDenied ? (
        isNative && (
          <Button variant="ghost" onClick={onOpenSettings}>
            설정 열기
          </Button>
        )
      ) : (
        <Button onClick={onAllow} loading={micState === 'requesting'}>
          마이크 켤게요!
        </Button>
      )}
    </>
  );
}
