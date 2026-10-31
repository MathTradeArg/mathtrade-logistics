"use client";

import NoCity from '@/components/city/NoCity';
import ReferrerOnly from '@/components/city/ReferrerOnly';
import TrackingEditor from '@/components/city/TrackingEditor';
import { StaffPage } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function NewShipmentPage() {
  const { cityAccess } = useAuth();
  const router = useRouter();
  useStaffTitle('Nuevo envío');

  if (!cityAccess) return <NoCity />;
  if (cityAccess.kind !== 'referrer') return <ReferrerOnly />;

  return (
    <StaffPage>
      <TrackingEditor
        cityId={cityAccess.city.id}
        onSaved={(saved) => router.replace(`/city/shipments/${saved.id}`)}
        onCancel={() => router.push('/city/shipments')}
      />
    </StaffPage>
  );
}
