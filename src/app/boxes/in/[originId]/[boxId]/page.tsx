"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffBanner, StaffDialog, StaffEmpty, StaffPage, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { getBox, markItemsReceived } from '@/hooks/boxes/boxApi';
import { boxOnwardDestinations, hasMixedDestinations, isBoxOpen, isTransitBox, receptorName } from '@/hooks/boxes/boxGrouping';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import { useAuth } from '@/hooks/useAuth';
import type { Box } from '@/types';
import { missingReportHref } from '@/app/more/report/missingReport';
import { formatTradeCode } from '@/utils/tradeCode';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TransitBoxView from './TransitBoxView';

/** Event staff may reopen a box that reached the event to rebuild it: a
 *  transit box (neither end is AMBA) or a box to AMBA already in a shipment.
 *  A box leaving AMBA already left; a box to AMBA never shipped keeps the
 *  receive flow. */
function canBeRebuilt(box: Box): boolean {
  if (box.origin === EVENT_LOCATION_ID) return false;
  return box.destiny !== EVENT_LOCATION_ID || box.tracking != null;
}

export default function IncomingBoxPage() {
  const params = useParams<{ originId: string; boxId: string }>();
  const boxId = Number(params.boxId);
  const { isAuthenticated, isLoading: authIsLoading, userId } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [box, setBox] = useState<Box | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only a failed load offers "Reintentar" (a reload); a failed mark does not.
  const [loadFailed, setLoadFailed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRebuild, setShowRebuild] = useState(false);
  const { inFlight, reopenBox } = useBoxLifecycle();

  const title = box?.number != null ? `#${box.number}` : 'Caja';
  useStaffTitle(box ? `${title}` : 'Caja');

  /** Reloads the box; returns it, or null if it failed (shown as `error`). */
  const load = useCallback(async (): Promise<Box | null> => {
    if (!boxId) return null;
    setIsLoading(true);
    setError(null);
    setLoadFailed(false);
    try {
      const next = await getBox(boxId);
      setBox(next);
      setSelected(new Set());
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la caja.');
      setLoadFailed(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [boxId]);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const pending = useMemo(
    () => (box?.math_items || []).filter((item) => item.status !== 5 && item.status !== 6),
    [box],
  );
  const received = useMemo(
    () => (box?.math_items || []).filter((item) => item.status === 5 || item.status === 6),
    [box],
  );

  const toggle = (code: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleReceive = async () => {
    if (selected.size === 0 || isSaving) return;
    setIsSaving(true);
    setError(null);
    setLoadFailed(false);
    try {
      await markItemsReceived(Array.from(selected), userId);
      setShowConfirm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron marcar los juegos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRebuild = async () => {
    try {
      const reopened = await reopenBox(boxId);
      if (reopened) {
        setShowRebuild(false);
        await load();
      }
    } catch {
      setShowRebuild(false); // the error toast comes from the hook
    }
  };

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if ( eventPhase === 0) {
    return <PhaseBlocked />;
  }

  if (box && canBeRebuilt(box) && isBoxOpen(box)) {
    return (
      <TransitBoxView box={box} onReload={load} reloadError={error} reloading={isLoading} userId={userId} />
    );
  }

  const rebuildable = box ? canBeRebuilt(box) : false;
  const transit = box ? isTransitBox(box) : false;
  const mixed = box ? hasMixedDestinations(box) : false;
  const onwardNames = box ? boxOnwardDestinations(box) : [];
  const destLabel = box
    ? mixed
      ? `Localidades mezcladas (${onwardNames.join(', ')})`
      : onwardNames[0] || box.destination_name
    : '';

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando caja..." />}
      {error && <StaffBanner onRetry={loadFailed ? load : undefined} retrying={isLoading}>{error}</StaffBanner>}
      {!isLoading && !box && <StaffEmpty>Caja no encontrada.</StaffEmpty>}

      {box && (
        <>
          <p className="text-body text-gray-500">{box.origin_name} → {destLabel}</p>
          {mixed && (
            <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-body font-medium text-red-800">
              Localidades mezcladas ({onwardNames.join(', ')}): hay que abrir esta caja y marcar los juegos como recibidos para separarlos por destino.
            </p>
          )}
          {transit && !mixed && (
            <p className="mt-2 text-body text-gray-600">
              Todos los juegos declarados van a {destLabel}. Si abrís la caja, marcá los juegos como recibidos para sumarlos al armado del evento.
            </p>
          )}

          {pending.length === 0 ? (
            <StaffEmpty>Todos los juegos de esta caja ya están en evento.</StaffEmpty>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pending.map((item) => {
                const checked = selected.has(item.assigned_trade_code);
                const receptor = receptorName(item);
                const forwardCityName =
                  item.location && item.location !== EVENT_LOCATION_ID
                    ? item.location_name
                    : box.destiny !== EVENT_LOCATION_ID
                      ? box.destination_name
                      : undefined;
                const forwardCity = forwardCityName ? `Sigue a ${forwardCityName}` : null;
                const subtitle = [
                  forwardCity,
                  receptor ? `Retira ${receptor}` : null,
                  item.reported_missing ? 'Faltante reportado' : null,
                ].filter(Boolean).join(' · ') || undefined;
                return (
                  <li key={item.id}>
                    <GameRow
                      title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                      subtitle={subtitle}
                      onClick={() => toggle(item.assigned_trade_code)}
                      selected={checked}
                      tone={item.reported_missing ? 'danger' : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {received.length > 0 && (
            <p className="mt-6 text-body text-gray-500">{received.length} ya recibidos</p>
          )}

          <Link
            href="/boxes/in/loose"
            className="mt-6 flex min-h-14 items-center justify-center rounded-lg border border-gray-200 bg-white text-body-lg font-semibold text-gray-800"
          >
            No está en la lista
          </Link>

          <Link
            href={missingReportHref({
              boxId: box.id,
              boxNumber: box.number,
              originName: box.origin_name,
              items: pending.filter((item) => selected.has(item.assigned_trade_code)),
            })}
            className={`mt-3 flex min-h-14 items-center justify-center text-body-lg font-semibold ${
              selected.size === 0 ? 'pointer-events-none text-gray-300' : 'text-gray-500'
            }`}
            aria-disabled={selected.size === 0}
          >
            Reportar faltante{selected.size > 1 ? ` (${selected.size})` : ''}
          </Link>

          {rebuildable && (
            <button
              type="button"
              disabled={inFlight}
              onClick={() => setShowRebuild(true)}
              className="staff-btn staff-btn-outline mt-3"
            >
              Rearmar caja
            </button>
          )}
        </>
      )}

      {pending.length > 0 && (
        <ThumbCta
          variant="success"
          disabled={selected.size === 0 || isSaving}
          onClick={() => setShowConfirm(true)}
        >
          Marcar recibidos ({selected.size})
        </ThumbCta>
      )}

      <StaffDialog
        open={showConfirm}
        title="Marcar recibidos"
        confirmLabel={`Confirmar (${selected.size})`}
        confirmDisabled={isSaving}
        onConfirm={handleReceive}
        onCancel={() => setShowConfirm(false)}
      >
        Vas a marcar {selected.size} juegos de esta caja como En evento.
      </StaffDialog>

      <StaffDialog
        open={showRebuild}
        title="Rearmar esta caja"
        confirmLabel="Rearmar"
        variant="danger"
        confirmDisabled={inFlight}
        onConfirm={handleRebuild}
        onCancel={() => setShowRebuild(false)}
      >
        La caja vuelve a estar abierta para rehacerla y conserva su número{box?.number != null ? ` (#${box.number})` : ''}. Marcá todos sus juegos como recibidos, también los que siguen a otras ciudades.
      </StaffDialog>
    </StaffPage>
  );
}
