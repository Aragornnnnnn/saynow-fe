// 여러 문자열을 순서대로 타이핑 → 대기 → 삭제 루프하는 훅
import { useEffect, useRef, useState } from 'react';

const TYPING_MS = 60;
const DELETE_DELAY_MS = 1200;
const NEXT_DELAY_MS = 300;

export function useTypingLoop(messages: string[], onType?: () => void, onClear?: () => void) {
  const [displayed, setDisplayed] = useState('');
  const onTypeRef = useRef(onType);
  const onClearRef = useRef(onClear);

  useEffect(() => { onTypeRef.current = onType; }, [onType]);
  useEffect(() => { onClearRef.current = onClear; }, [onClear]);

  useEffect(() => {
    if (messages.length === 0) return;

    let index = 0;
    let charPos = 0;
    let isDeleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function tick() {
      const current = messages[index];

      if (!isDeleting) {
        charPos += 1;
        setDisplayed(current.slice(0, charPos));
        onTypeRef.current?.();

        if (charPos === current.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, DELETE_DELAY_MS);
          return;
        }
      } else {
        onClearRef.current?.();
        setDisplayed('');
        isDeleting = false;
        index = (index + 1) % messages.length;
        charPos = 0;
        timeoutId = setTimeout(tick, NEXT_DELAY_MS);
        return;
      }

      timeoutId = setTimeout(tick, TYPING_MS);
    }

    timeoutId = setTimeout(tick, NEXT_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  return displayed;
}
