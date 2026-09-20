"use client";

import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

type ThumbCtaVariant = 'primary' | 'success' | 'danger';

interface ThumbCtaProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ThumbCtaVariant;
}

const variantClass: Record<ThumbCtaVariant, string> = {
  primary: 'staff-btn-primary',
  success: 'staff-btn-want',
  danger: 'staff-btn-danger',
};

export default function ThumbCta({
  variant = 'primary',
  className,
  children,
  ...props
}: ThumbCtaProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        className={clsx(
          'staff-btn staff-thumb-cta pointer-events-auto',
          variantClass[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
