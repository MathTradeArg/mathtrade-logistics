"use client";

import NoCity from '@/components/city/NoCity';
import ReferrerOnly from '@/components/city/ReferrerOnly';
import TrackingEditor from '@/components/city/TrackingEditor';
import { StaffPage } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { useCityView } from '@/contexts/CityViewContext';
import { useRouter } from 'next/navigation';

export default function NewShipmentPage() {
  const { cityId, kind, readOnly } = useCityView();
  const router = useRouter();
  useStaffTitle('Nuevo envío');

  if (cityId === null) return <NoCity />;
  if (kind !== 'referrer') return <ReferrerOnly />;
  if (readOnly) return <ReferrerOnly message="Vista de solo lectura: no se cargan envíos." />;

  return (
    <StaffPage>
      <TrackingEditor
        cityId={cityId}
        onSaved={(saved) => router.replace(`/city/shipments/${saved.id}`)}
        onCancel={() => router.push('/city/shipments')}
      />
    </StaffPage>
  );
}
