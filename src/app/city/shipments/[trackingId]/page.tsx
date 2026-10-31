"use client";

import FullScreenImageModal from '@/components/common/FullScreenImageModal';
import { LoadingSpinner } from '@/components/common/ui';
import NoCity from '@/components/city/NoCity';
import ReferrerOnly from '@/components/city/ReferrerOnly';
import TrackingEditor from '@/components/city/TrackingEditor';
import TrackingSummary from '@/components/city/TrackingSummary';
import { apiErrorMessage } from '@/components/city/errors';
import { StaffDialog, StaffEmpty, StaffError, StaffPage } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { deleteTracking, getTracking } from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import type { Tracking } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ShipmentPage() {
  const params = useParams<{ trackingId: string }>();
  const trackingId = Number(params.trackingId);
  const { cityAccess } = useAuth();
  const router = useRouter();
  const isReferrer = cityAccess?.kind === 'referrer';
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useStaffTitle(tracking ? tracking.tracking_code : 'Envío');

  useEffect(() => {
    if (!isReferrer || !trackingId) return;
    let cancelled = false;
    getTracking(trackingId)
      .then((row) => {
        if (!cancelled) setTracking(row);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'No se pudo cargar el envío.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReferrer, trackingId]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteTracking(trackingId);
      router.replace('/city/shipments');
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar el envío.'));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!cityAccess) return <NoCity />;
  if (!isReferrer) return <ReferrerOnly />;

  if (editing && tracking) {
    return (
      <StaffPage>
        <TrackingEditor
          cityId={cityAccess.city.id}
          tracking={tracking}
          onSaved={(saved) => {
            setTracking(saved);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </StaffPage>
    );
  }

  return (
    <StaffPage>
      {isLoading && <LoadingSpinner message="Cargando envío..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !tracking && !error && <StaffEmpty>Envío no encontrado.</StaffEmpty>}
      {tracking && (
        <>
          <div className="staff-card p-4">
            <TrackingSummary tracking={tracking} onOpenImage={setImageUrl} />
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className="staff-btn staff-btn-primary" onClick={() => setEditing(true)}>
              Editar
            </button>
            <button
              type="button"
              className="staff-btn staff-btn-outline text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar
            </button>
          </div>
        </>
      )}
      <StaffDialog
        open={confirmDelete}
        title="Eliminar envío"
        confirmLabel="Eliminar"
        variant="danger"
        confirmDisabled={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        Las cajas quedan cerradas y sin envío.
      </StaffDialog>
      <FullScreenImageModal imageUrl={imageUrl} onClose={() => setImageUrl(null)} />
    </StaffPage>
  );
}
