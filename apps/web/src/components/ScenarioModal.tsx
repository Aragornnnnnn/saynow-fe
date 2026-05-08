// 시나리오 카드 클릭 시 표시되는 상세 모달
'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Scenario } from '@/lib/scenarios';

const CATEGORY_IMAGES: Record<string, string> = {
  카페: '☕',
  공항: '✈️',
  호텔: '🏨',
  식당: '🍽️',
  택시: '🚕',
};

const DRAG_CLOSE_THRESHOLD = 100;

interface ScenarioModalProps {
  scenario: Scenario;
  onClose: () => void;
}

export function ScenarioModal({ scenario, onClose }: ScenarioModalProps) {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function handleStart(clientY: number) {
    startYRef.current = clientY;
  }

  function handleMove(clientY: number) {
    if (startYRef.current === null) return;
    const delta = clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  }

  function handleEnd() {
    if (dragY >= DRAG_CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
    startYRef.current = null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/40 touch-none overscroll-none' onClick={onClose}>
      <div
        className='w-full max-w-md rounded-t-3xl bg-card pb-10 pt-6 px-6'
        style={{
          transform: `translateY(${dragY}px)`,
          transition: 'none',
          animation: 'slide-up 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientY)}
        onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientY)}
        onMouseUp={handleEnd}
      >
        {/* 핸들 */}
        <div className='mx-auto mb-5 h-1 w-10 rounded-full bg-border cursor-grab active:cursor-grabbing' />

        {/* 카테고리 이미지 영역 */}
        <div className='mb-5 flex h-36 items-center justify-center rounded-2xl bg-[#FFF4ED]'>
          <span className='text-7xl'>{CATEGORY_IMAGES[scenario.category]}</span>
        </div>

        {/* 제목 + 난이도 */}
        <div className='mb-3 flex items-center gap-2'>
          <h2 className='text-lg font-bold text-foreground'>{scenario.title}</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              scenario.difficulty === '쉬움' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
            }`}
          >
            {scenario.difficulty}
          </span>
        </div>

        {/* 상황 설명 */}
        <p className='mb-4 text-sm text-muted-foreground leading-relaxed'>{scenario.description}</p>

        {/* 달성 목표 */}
        <div className='mb-6 rounded-xl bg-[#FFF4ED] px-4 py-3'>
          <p className='text-xs font-semibold text-primary mb-0.5'>달성 목표</p>
          <p className='text-sm text-foreground'>{scenario.goal}</p>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={() => router.push(`/conversation/${scenario.id}`)}
          className='w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white active:opacity-80 transition-opacity'
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
