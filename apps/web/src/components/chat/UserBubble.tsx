// 사용자 말풍선 껍데기 — 하위 콘텐츠(피드백 카드 등)는 children으로 주입
'use client';

import { ReactNode } from 'react';

interface UserBubbleProps {
  text: string;
  onPress?: () => void;
  children?: ReactNode;
}

export function UserBubble({ text, onPress, children }: UserBubbleProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onPress}
        disabled={!onPress}
        className={`max-w-[80%] text-left ${onPress ? 'active:opacity-75' : ''}`}
      >
        <div className="rounded-2xl rounded-br-none bg-primary px-4 py-3">
          <p className="text-sm text-white leading-relaxed">{text}</p>
        </div>
      </button>
      {children}
    </div>
  );
}
