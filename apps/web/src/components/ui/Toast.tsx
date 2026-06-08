// 전역 토스트 알림 컴포넌트 및 상태 관리
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastItem {
  id: number;
  message: string;
}

type Listener = (message: string) => void;

const listeners = new Set<Listener>();
let nextId = 0;

export function toast(message: string) {
  listeners.forEach((l) => l(message));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (message) => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+64px)] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-2xl px-5 py-3 text-[14px] font-semibold text-white shadow-lg"
            style={{ background: 'rgba(30,30,30,0.92)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}
          >
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
