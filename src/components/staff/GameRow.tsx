"use client";

import clsx from 'clsx';
import Link from 'next/link';
import { Check } from 'phosphor-react';
import { ReactNode } from 'react';

interface GameRowProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  selected?: boolean;
  tone?: 'danger';
}

export default function GameRow({
  title,
  subtitle,
  trailing,
  onClick,
  href,
  disabled = false,
  selected,
  tone,
}: GameRowProps) {
  const selectable = selected !== undefined;
  const className = clsx(
    'staff-card flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-gray-900',
    (onClick || href) && !disabled && 'active:bg-gray-100',
    disabled && 'bg-muted opacity-45',
    tone === 'danger' && !selected && 'border-danger/40 bg-danger/5',
    selectable && selected && 'border-primary bg-primary/10',
  );

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{title}</p>
        {subtitle && (
          <p className={`mt-0.5 text-sm ${tone === 'danger' ? 'text-danger' : 'text-gray-500'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {selectable && (
        <span
          className={clsx(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2',
            selected ? 'border-primary bg-primary text-white' : 'border-stroke bg-white',
          )}
          aria-hidden
        >
          {selected ? <Check size={16} weight="bold" /> : null}
        </span>
      )}
      {trailing}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        role={selectable ? 'checkbox' : undefined}
        aria-checked={selectable ? selected : undefined}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
