import clsx from 'clsx';
import type { ReactNode } from 'react';

type HeadingVariant = 'display' | 'heading' | 'body-lg';

// Literal class names so Tailwind picks them up.
const VARIANTS: Record<HeadingVariant, string> = {
  display: 'font-display font-semibold text-ink text-display',
  heading: 'font-display font-semibold text-ink text-heading',
  'body-lg': 'font-bold text-body-lg',
};

export function StaffHeading({ level = 2, variant = 'heading', className, children }: {
  level?: 1 | 2 | 3;
  variant?: HeadingVariant;
  className?: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as const;
  return <Tag className={clsx('text-balance', VARIANTS[variant], className)}>{children}</Tag>;
}
