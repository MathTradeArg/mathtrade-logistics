"use client";

import clsx from 'clsx';
import { InputHTMLAttributes } from 'react';

export default function StaffSearch({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="search"
      className={clsx(
        'min-h-14 w-full rounded-full border border-gray-200 bg-gray-100 px-4 text-base text-gray-900',
        'placeholder:text-gray-400 focus:border-primary focus:outline-none focus:shadow-[0_0_6px_theme(colors.primary)]',
        className,
      )}
      {...props}
    />
  );
}
