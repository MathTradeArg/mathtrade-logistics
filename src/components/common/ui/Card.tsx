import clsx from 'clsx';
import type { ElementType, ReactNode } from 'react';

export type CardTone = 'default' | 'danger' | 'selected' | 'disabled' | 'primary';

export const cardClass = ({ tone = 'default', panel = false }: { tone?: CardTone; panel?: boolean } = {}) =>
  clsx(panel ? 'staff-panel' : 'staff-card', {
    'border-danger/40 bg-danger/5': tone === 'danger',
    'border-primary bg-primary/10': tone === 'selected',
    // staff-card sets an unlayered white background, so these need `!` to win.
    '!border-primary !bg-primary text-white': tone === 'primary',
    'bg-muted opacity-45': tone === 'disabled',
  });

interface CardProps {
  as?: ElementType;
  tone?: CardTone;
  panel?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Card({ as: Tag = 'div', tone, panel, className, children }: CardProps) {
  return <Tag className={clsx(cardClass({ tone, panel }), className)}>{children}</Tag>;
}
