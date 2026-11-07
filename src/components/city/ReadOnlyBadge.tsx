"use client";

import { Chip } from '@/components/common/ui/Chip';
import { useCityView } from '@/contexts/CityViewContext';

/** "Solo lectura" chip while an admin looks at another city or edition. */
export default function ReadOnlyBadge() {
  const { readOnly } = useCityView();
  if (!readOnly) return null;
  return (
    <Chip tone="warning" className="mb-4">
      Solo lectura
    </Chip>
  );
}
