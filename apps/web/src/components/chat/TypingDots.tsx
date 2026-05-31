// 채팅 타이핑 중 점 애니메이션
export function TypingDots({ color = 'gray' }: { color?: 'gray' | 'blue' }) {
  const bgColor = color === 'blue' ? '#60a5fa' : undefined;
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground/50"
          style={{ animation: `typingBounce 0.9s ease-in-out ${i * 0.18}s infinite`, ...(bgColor ? { backgroundColor: bgColor } : {}) }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
