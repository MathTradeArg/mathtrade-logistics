"use client";

import FullScreenImageModal from '@/components/common/FullScreenImageModal';
import { LoadingSpinner } from '@/components/common/ui';
import NoCity from '@/components/city/NoCity';
import ReferrerOnly from '@/components/city/ReferrerOnly';
import TrackingSummary from '@/components/city/TrackingSummary';
import { apiErrorMessage } from '@/components/city/errors';
import { StaffEmpty, StaffError, StaffPage, ThumbCta } from '@/components/staff';
import { listTrackings } from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import type { Tracking } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CityShipmentsPage() {
  const { cityAccess } = useAuth();
  const router = useRouter();
  const isReferrer = cityAccess?.kind === 'referrer';
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isReferrer) return;
    let cancelled = false;
    listTrackings()
      .then((rows) => {
        if (!cancelled) setTrackings(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar los envíos.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReferrer]);

  if (!cityAccess) return <NoCity />;
  if (!isReferrer) return <ReferrerOnly />;

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando envíos..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !error && trackings.length === 0 && (
        <StaffEmpty>Todavía no cargaste envíos.</StaffEmpty>
      )}
      {trackings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {trackings.map((tracking) => (
            <li key={tracking.id} className="staff-card p-4">
              <TrackingSummary tracking={tracking} onOpenImage={setImageUrl} />
              <Link
                href={`/city/shipments/${tracking.id}`}
                className="staff-btn staff-btn-outline mt-3"
              >
                Ver envío
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ThumbCta onClick={() => router.push('/city/shipments/new')}>Nuevo envío</ThumbCta>
      <FullScreenImageModal imageUrl={imageUrl} onClose={() => setImageUrl(null)} />
    </StaffPage>
  );
}
