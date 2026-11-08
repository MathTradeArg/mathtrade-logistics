"use client";

import clsx from 'clsx';
import { forwardRef, InputHTMLAttributes } from 'react';

const StaffSearch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function StaffSearch({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="search"
        className={clsx(
          'min-h-14 w-full rounded-full border border-gray-200 bg-gray-100 px-4 text-body-lg text-gray-900',
          'placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40',
          className,
        )}
        {...props}
      />
    );
  },
);

export default StaffSearch;
