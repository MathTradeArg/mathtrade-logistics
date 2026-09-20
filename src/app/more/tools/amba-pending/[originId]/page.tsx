"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffEmpty, StaffError, StaffPage, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { listAmbaPending, markItemsReceived, type AmbaPendingOrigin } from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function AmbaPendingOriginPage() {
  const params = useParams<{ originId: string }>();
  const originId = Number(params.originId);
  const { isAuthenticated, isLoading: authIsLoading, userId } = useAuth();
  const [origin, setOrigin] = useState<AmbaPendingOrigin | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useStaffTitle(origin?.origin_name || 'Pendientes AMBA');

  const load = useCallback(async () => {
    if (!originId) return;
    setIsLoading(true);
    setError(null);
    try {
      const groups = await listAmbaPending();
      const next = groups.find((row) => row.origin_id === originId) || null;
      setOrigin(next);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las pendientes.');
    } finally {
      setIsLoading(false);
    }
  }, [originId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
  }, [isAuthenticated, load]);

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron marcar los juegos.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando pendientes..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !origin && <StaffEmpty>No hay pendientes para esta localidad.</StaffEmpty>}

      {origin && (
        <>
          <h2 className="text-sm font-semibold text-gray-500">Juegos no recibidos</h2>
          {origin.trades.length === 0 ? (
            <StaffEmpty>No hay juegos pendientes a AMBA.</StaffEmpty>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {origin.trades.map((trade) => (
                <li key={trade.assigned_trade_code}>
                  <GameRow
                    title={`#${trade.assigned_trade_code} ${trade.title}`}
                    subtitle={[
                      `${trade.recipient_first_name} ${trade.recipient_last_name}`.trim(),
                      trade.box
                        ? `Caja #${trade.box.number ?? 'abierta'} → ${trade.box.destination_name}`
                        : 'Sin caja',
                    ].filter(Boolean).join(' · ')}
                    onClick={() => toggle(trade.assigned_trade_code)}
                    selected={selected.has(trade.assigned_trade_code)}
                  />
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 text-sm font-semibold text-gray-500">Cajas AMBA sin abrir</h2>
          {origin.unopened_amba_boxes.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No hay cajas AMBA pendientes de esta ciudad.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {origin.unopened_amba_boxes.map((box) => (
                <li key={box.id}>
                  <GameRow
                    title={`#${box.number ?? 'abierta'}`}
                    subtitle={`${box.pending_count} pendientes`}
                    href={`/boxes/in/${origin.origin_id}/${box.id}`}
                  />
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 text-sm font-semibold text-gray-500">Cajas de tránsito</h2>
          {origin.transit_boxes.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No hay cajas de tránsito de esta ciudad.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {origin.transit_boxes.map((box) => (
                <li key={box.id}>
                  <GameRow
                    title={`#${box.number ?? 'abierta'} → ${box.destination_name}`}
                    subtitle={`${box.item_count} juegos`}
                    href={`/boxes/in/${origin.origin_id}/${box.id}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selected.size > 0 && (
        <ThumbCta onClick={handleReceive} disabled={isSaving} variant="success">
          Marcar {selected.size} en evento
        </ThumbCta>
      )}
    </StaffPage>
  );
}
