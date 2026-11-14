"use client";

import clsx from 'clsx';

type Segment<T extends string> = {
  id: T;
  label: string;
};

interface StaffSegmentedProps<T extends string> {
  value: T;
  options: Segment<T>[];
  onChange: (value: T) => void;
}

export default function StaffSegmented<T extends string>({
  value,
  options,
  onChange,
}: StaffSegmentedProps<T>) {
  return (
    <div role="group" className={clsx('grid gap-3', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={clsx(
              'min-h-14 rounded-full px-3 text-body font-semibold',
              active ? 'bg-ink text-white' : 'border border-stroke bg-white text-gray-700',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
