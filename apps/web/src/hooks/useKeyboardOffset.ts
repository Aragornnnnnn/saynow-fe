// 소프트 키보드가 올라올 때 viewport 줄어드는 높이를 반환하는 훅
import { useEffect, useState } from 'react';

export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const keyboardHeight = window.innerHeight - (vv!.height + vv!.offsetTop);
      setOffset(Math.max(0, keyboardHeight));
    }

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return offset;
}
