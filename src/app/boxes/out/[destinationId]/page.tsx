"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffDialog, StaffEmpty, StaffError, StaffPage, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listBoxes, listItems } from '@/hooks/boxes/boxApi';
import { boxContentsSummary, isBoxOpen, openBoxTitle } from '@/hooks/boxes/boxGrouping';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function BoxesOutDestinationPage() {
  const params = useParams<{ destinationId: string }>();
  const destinationId = Number(params.destinationId);
  const router = useRouter();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { inFlight, openBox } = useBoxLifecycle();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [confirmAnother, setConfirmAnother] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinationName =
    boxes[0]?.destination_name ||
    items.find((item) => item.location === destinationId)?.location_name ||
    'Destino';
  useStaffTitle(destinationName);

  const fetchData = useCallback(async (): Promise<Box[]> => {
    const [nextBoxes, nextItems] = await Promise.all([
      listBoxes({ destination: destinationId, origin: EVENT_LOCATION_ID }),
      listItems({ destination: destinationId }),
    ]);
    setBoxes(nextBoxes);
    setItems(nextItems);
    return nextBoxes;
  }, [destinationId]);

  const load = useCallback(async () => {
    if (!destinationId) return;
    setIsLoading(true);
    setError(null);
    try {
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cajas.');
    } finally {
      setIsLoading(false);
    }
  }, [destinationId, fetchData]);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const openBoxes = useMemo(
    () => boxes.filter(isBoxOpen).sort((a, b) => b.id - a.id),
    [boxes],
  );
  const closedBoxes = useMemo(
    () => boxes.filter((box) => !isBoxOpen(box)).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [boxes],
  );

  const createAndGo = async () => {
    try {
      const created = await openBox(destinationId);
      if (created) {
        router.push(`/boxes/out/${destinationId}/${created.id}`);
      }
    } catch {
      // toast via hook
    }
  };

  const handleNewBox = async () => {
    if (checking || inFlight || !destinationId) return;
    setChecking(true);
    try {
      const nextBoxes = await fetchData();
      if (nextBoxes.some(isBoxOpen)) {
        setConfirmAnother(true);
        return;
      }
      await createAndGo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cajas.');
    } finally {
      setChecking(false);
    }
  };

  const handleConfirmAnother = async () => {
    setConfirmAnother(false);
    await createAndGo();
  };

  const handleCancelAnother = async () => {
    setConfirmAnother(false);
    await load();
  };

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando cajas..." />}
      {error && <StaffError>{error}</StaffError>}

      {!isLoading && (
        <>
          <h2 className="text-sm font-semibold text-gray-500">Cajas abiertas</h2>
          {openBoxes.length === 0 ? (
            <StaffEmpty>No hay cajas abiertas. Creá una para empezar.</StaffEmpty>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {openBoxes.map((box) => (
                <li key={box.id}>
                  <GameRow
                    href={`/boxes/out/${destinationId}/${box.id}`}
                    title={openBoxTitle(box)}
                    subtitle={boxContentsSummary(box)}
                  />
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 text-sm font-semibold text-gray-500">Cerradas</h2>
          {closedBoxes.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Todavía no hay cajas cerradas a este destino.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {closedBoxes.map((box) => (
                <li key={box.id}>
                  <GameRow
                    title={`#${box.number}`}
                    subtitle={`${box.math_items.length} juegos`}
                    disabled
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ThumbCta onClick={handleNewBox} disabled={inFlight || isLoading || checking}>
        Nueva caja
      </ThumbCta>

      <StaffDialog
        open={confirmAnother}
        title={`Ya hay una caja abierta siendo armada para ${destinationName}`}
        confirmLabel="Sí, abrir otra"
        cancelLabel="No"
        confirmDisabled={inFlight || checking}
        onConfirm={handleConfirmAnother}
        onCancel={handleCancelAnother}
      >
        ¿Estás segure de que querés abrir otra?
      </StaffDialog>
    </StaffPage>
  );
}
