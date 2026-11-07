import clsx from 'clsx';
import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'alert' | 'good' | 'used' | 'none' | 'want' | 'done' | 'warning' | 'info';

const TONES: Record<ChipTone, string> = {
  neutral: 'bg-gray-100 text-gray-800',
  alert: 'bg-danger/10 text-red-800 font-bold',
  good: 'bg-green-100 text-green-800 font-semibold',
  used: 'bg-orange-100 text-orange-800 font-semibold',
  none: 'bg-gray-200 text-gray-600 font-semibold',
  want: 'bg-want/10 text-want-ink font-bold',
  done: 'bg-gray-200 text-gray-800 font-bold',
  warning: 'bg-warning/20 text-gray-900 font-semibold',
  info: 'bg-primary/10 text-primary font-semibold',
};

export function Chip({ tone = 'neutral', className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex max-w-full items-center rounded-full px-3 py-1 text-caption', TONES[tone], className)}>
      {children}
    </span>
  );
}
