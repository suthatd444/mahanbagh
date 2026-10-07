import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className = '', variant = 'default', ...props }, ref) => {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50';
  const variants = variant === 'default' ? 'bg-primary text-white hover:opacity-90' : 'border border-gray-300 bg-white hover:bg-gray-50';
  return <button ref={ref} className={`${base} ${variants} ${className}`} {...props} />;
});
Button.displayName = 'Button';

export { Button };
