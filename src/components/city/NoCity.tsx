"use client";

import { StaffEmpty, StaffPage } from '@/components/staff';
import { useCityView } from '@/contexts/CityViewContext';
import Link from 'next/link';

/** City screens without a city: a user who isn't a referrer or local
 *  volunteer, or an admin who hasn't picked one in "Ver como" yet. */
export default function NoCity() {
  const { isAdmin } = useCityView();
  return (
    <StaffPage>
      {isAdmin ? (
        <StaffEmpty>
          Elegí una ciudad en <Link href="/city" className="font-semibold text-primary underline">Mi ciudad</Link>.
        </StaffEmpty>
      ) : (
        <StaffEmpty>No tenés una ciudad asignada.</StaffEmpty>
      )}
    </StaffPage>
  );
}
