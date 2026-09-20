"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffEmpty, StaffError, StaffPage, StaffSegmented } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listBoxes } from '@/hooks/boxes/boxApi';
import { hasPendingIncomingItems, isTransitBox } from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import type { Box } from '@/types';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

type Segment = 'amba' | 'transit';

function boxLabel(box: Box): string {
  return box.number == null ? 'Caja abierta' : `#${box.number}`;
}

export default function BoxesInOriginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
      <BoxesInOriginPageContent />
    </Suspense>
  );
}

function BoxesInOriginPageContent() {
  const params = useParams<{ originId: string }>();
  const searchParams = useSearchParams();
  const originId = Number(params.originId);
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const initialSegment = searchParams.get('segment') === 'transit' ? 'transit' : 'amba';
  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const originName = boxes[0]?.origin_name || '';
  useStaffTitle(originName || 'Llegan');

  const load = useCallback(async () => {
    if (!originId) return;
    setIsLoading(true);
    setError(null);
    try {
      setBoxes(await listBoxes({ origin: originId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cajas.');
    } finally {
      setIsLoading(false);
    }
  }, [originId]);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const ambaBoxes = useMemo(
    () =>
      boxes
        .filter((box) => box.destiny === EVENT_LOCATION_ID && hasPendingIncomingItems(box))
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [boxes],
  );

  const transitBoxes = useMemo(
    () =>
      boxes
        .filter((box) => isTransitBox(box))
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [boxes],
  );

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  const visible = segment === 'amba' ? ambaBoxes : transitBoxes;

  return (
    <StaffPage>
      <StaffSegmented
        value={segment}
        onChange={setSegment}
        options={[
          { id: 'amba', label: 'Cajas a AMBA' },
          { id: 'transit', label: 'Siguen de largo' },
        ]}
      />

      {isLoading && <div className="mt-8"><LoadingSpinner message="Cargando cajas..." /></div>}
      {error && <StaffError>{error}</StaffError>}

      {!isLoading && !error && visible.length === 0 && (
        <StaffEmpty>
          {segment === 'amba' ? 'No hay cajas a AMBA pendientes de esta localidad.' : 'No hay cajas de tránsito de esta localidad.'}
        </StaffEmpty>
      )}

      {!isLoading && !error && visible.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((box) => (
            <li key={box.id}>
              {segment === 'transit' ? (
                <GameRow
                  href={`/boxes/in/${originId}/${box.id}`}
                  title={boxLabel(box)}
                  subtitle={`${box.math_items.length} juegos · destino ${box.destination_name} · no abrir`}
                />
              ) : (
                <GameRow
                  href={`/boxes/in/${originId}/${box.id}`}
                  title={boxLabel(box)}
                  subtitle={`${box.math_items.filter((item) => item.status !== 5 && item.status !== 6).length} pendientes`}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </StaffPage>
  );
}
