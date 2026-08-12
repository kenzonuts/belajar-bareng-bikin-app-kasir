import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  children,
  variant = 'primary',
  block,
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  block?: boolean;
  size?: 'sm' | 'md';
}) {
  const classes = [
    'ui-btn',
    variant !== 'primary' ? `ui-btn--${variant}` : '',
    block ? 'ui-btn--block' : '',
    size === 'sm' ? 'ui-btn--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
