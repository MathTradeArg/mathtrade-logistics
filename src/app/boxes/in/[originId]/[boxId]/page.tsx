"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffDialog, StaffEmpty, StaffError, StaffPage, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { getBox, markItemsReceived } from '@/hooks/boxes/boxApi';
import { isTransitBox, receptorName } from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import type { Box } from '@/types';
import { missingReportHref } from '@/app/more/report/missingReport';
import TransitBoxView from './TransitBoxView';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [showConfirm, setShowConfirm] = useState(false);

  const title = box?.number != null ? `#${box.number}` : 'Caja';
  useStaffTitle(box ? `${title}` : 'Caja');

  const load = useCallback(async () => {
    if (!boxId) return;
    setIsLoading(true);
    setError(null);
    try {
      const next = await getBox(boxId);
      setBox(next);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la caja.');
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

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  if (box && isTransitBox(box)) {
    return <TransitBoxView box={box} onReload={load} />;
  }

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando caja..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !box && <StaffEmpty>Caja no encontrada.</StaffEmpty>}

      {box && (
        <>
          <p className="text-sm text-gray-500">{box.origin_name} → {box.destination_name}</p>

          {pending.length === 0 ? (
            <StaffEmpty>Todos los juegos de esta caja ya están en evento.</StaffEmpty>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pending.map((item) => {
                const checked = selected.has(item.assigned_trade_code);
                const receptor = receptorName(item);
                const subtitle = [
                  receptor ? `Retira ${receptor}` : null,
                  item.reported_missing ? 'Faltante reportado' : null,
                ].filter(Boolean).join(' · ') || undefined;
                return (
                  <li key={item.id}>
                    <GameRow
                      title={`${item.assigned_trade_code} · ${item.title}`}
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
            <p className="mt-6 text-sm text-gray-500">{received.length} ya recibidos</p>
          )}

          <Link
            href="/boxes/in/loose"
            className="mt-6 flex min-h-14 items-center justify-center rounded-lg border border-gray-200 bg-white text-base font-semibold text-gray-800"
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
            className={`mt-3 flex min-h-14 items-center justify-center text-base font-semibold ${
              selected.size === 0 ? 'pointer-events-none text-gray-300' : 'text-gray-500'
            }`}
            aria-disabled={selected.size === 0}
          >
            Reportar faltante{selected.size > 1 ? ` (${selected.size})` : ''}
          </Link>
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
    </StaffPage>
  );
}
