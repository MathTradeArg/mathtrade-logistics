"use client";

import * as React from "react";
import { triggerHaptic } from '@/utils/haptics';

interface SwitchProps extends React.ComponentPropsWithoutRef<"button"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        triggerHaptic();
        onCheckedChange(!checked);
      }}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 focus:border-transparent active:outline-none active:ring-0 active:border-transparent"
        focus:outline-none focus:ring-0 focus:border-transparent active:outline-none active:ring-0 active:border-transparent
        ${checked ? 'bg-secondary-blue' : 'bg-gray-200 dark:bg-gray-600'}
        ${className || ''}
      `}
      ref={ref}
      {...props}
    >
      <span aria-hidden="true" className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full nm-surface shadow ring-0 transition duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `} />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
