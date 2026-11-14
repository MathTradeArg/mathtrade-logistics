"use client";

import clsx from 'clsx';
import Link from 'next/link';
import { Check } from 'phosphor-react';
import { ReactNode } from 'react';
import { cardClass, type CardTone } from '@/components/common/ui/Card';

interface GameRowProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  selected?: boolean;
  tone?: 'danger' | 'primary' | 'critical';
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
  let cardTone: CardTone = 'default';
  if (disabled) cardTone = 'disabled';
  else if (selectable && selected) cardTone = 'selected';
  else if (tone === 'danger') cardTone = 'danger';
  else if (tone === 'primary') cardTone = 'primary';
  else if (tone === 'critical') cardTone = 'critical';
  const className = clsx(
    cardClass({ tone: cardTone }),
    'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left',
    cardTone !== 'primary' && cardTone !== 'critical' && 'text-gray-900',
    (onClick || href) && !disabled && 'active:bg-gray-100',
  );

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{title}</p>
        {subtitle && (
          <p className={`mt-0.5 text-body ${tone === 'danger' ? 'text-danger' : tone === 'primary' && !disabled ? 'text-brand-ink/80' : tone === 'critical' && !disabled ? 'text-white/80' : 'text-gray-500'}`}>
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
