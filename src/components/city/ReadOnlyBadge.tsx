"use client";

import { useCityView } from '@/contexts/CityViewContext';

/** "Solo lectura" chip while an admin looks at another city or edition. */
export default function ReadOnlyBadge() {
  const { readOnly } = useCityView();
  if (!readOnly) return null;
  return (
    <p className="mb-4 inline-block rounded-full bg-warning/20 px-3 py-1 text-sm font-semibold text-gray-900">
      Solo lectura
    </p>
  );
}
