// 앱 전체에서 사용하는 3D 버튼 컴포넌트
import { forwardRef } from 'react';

type Variant = 'primary' | 'white' | 'secondary' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-[0_5px_0_#A85822] active:shadow-[0_2px_0_#A85822]',
  white:
    'bg-linear-to-b from-white to-gray-100 text-primary shadow-[0_5px_0_rgba(255,255,255,0.45)] active:shadow-[0_2px_0_rgba(255,255,255,0.45)]',
  secondary:
    'bg-[#EBEBEA] text-foreground shadow-[0_5px_0_#C8C8C6] active:shadow-[0_2px_0_#C8C8C6]',
  ghost:
    'bg-white text-foreground border border-border shadow-[0_5px_0_#C8C8C6] active:shadow-[0_2px_0_#C8C8C6]',
  danger:
    'bg-red-600 text-white shadow-[0_5px_0_#991B1B] active:shadow-[0_2px_0_#991B1B]',
};

const sizeClasses: Record<Size, string> = {
  lg: 'h-14 rounded-2xl text-base font-bold',
  md: 'h-12 rounded-xl text-sm font-semibold',
  sm: 'h-10 rounded-xl text-sm font-semibold',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'lg', loading = false, disabled, className = '', children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'flex w-full items-center justify-center gap-2',
          'transition-transform duration-75',
          'active:translate-y-0.75',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled ? 'opacity-45 cursor-not-allowed translate-y-0! shadow-none!' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <>
            <span
              className={`h-4 w-4 rounded-full border-2 animate-spin ${
                variant === 'ghost' || variant === 'secondary'
                  ? 'border-foreground/30 border-t-foreground'
                  : 'border-white/30 border-t-white'
              }`}
            />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
