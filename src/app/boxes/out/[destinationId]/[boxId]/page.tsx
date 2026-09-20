"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffDialog, StaffEmpty, StaffError, StaffPage, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { getBox, listBoxes, listItems } from '@/hooks/boxes/boxApi';
import { boxedTradeIds, boxContentsSummary, isBoxOpen, openBoxTitle, packerName, receptorName } from '@/hooks/boxes/boxGrouping';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Mode = 'view' | 'add' | 'move';

export default function OutgoingBoxPage() {
  const params = useParams<{ destinationId: string; boxId: string }>();
  const destinationId = Number(params.destinationId);
  const boxId = Number(params.boxId);
  const router = useRouter();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { inFlight, addItems, removeItem, moveItem, closeBox, deleteBox } = useBoxLifecycle();

  const [box, setBox] = useState<Box | null>(null);
  const [openBoxes, setOpenBoxes] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [selectedAdds, setSelectedAdds] = useState<Set<number>>(new Set());
  const [movingTradeId, setMovingTradeId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Item | null>(null);
  const [closedNumber, setClosedNumber] = useState<number | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [addedTitles, setAddedTitles] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useStaffTitle(box?.number != null ? `#${box.number}` : 'Caja abierta');

  const load = useCallback(async () => {
    if (!boxId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextBox, nextBoxes, nextItems] = await Promise.all([
        getBox(boxId),
        listBoxes({ destination: destinationId, origin: EVENT_LOCATION_ID, status: 'open' }),
        listItems({ destination: destinationId }),
      ]);
      setBox(nextBox);
      setOpenBoxes(nextBoxes.filter((candidate) => candidate.id !== boxId));
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la caja.');
    } finally {
      setIsLoading(false);
    }
  }, [boxId, destinationId]);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const availableItems = useMemo(() => {
    if (!box) return [];
    const boxed = boxedTradeIds([box, ...openBoxes]);
    return items.filter(
      (item) => item.status === 5 && item.location === box.destiny && !boxed.has(item.id),
    );
  }, [box, items, openBoxes]);

  const toggleAdd = (tradeId: number) => {
    setSelectedAdds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) next.delete(tradeId);
      else next.add(tradeId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedAdds.size === 0) return;
    try {
      const updated = await addItems(boxId, Array.from(selectedAdds));
      if (updated) {
        setBox(updated);
        setSelectedAdds(new Set());
        setMode('view');
        await load();
      }
    } catch {
      // toast via hook
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      const ok = await removeItem(boxId, removeTarget.id);
      if (ok) {
        setRemoveTarget(null);
        await load();
      }
    } catch {
      // toast via hook
    }
  };

  const handleMove = async (toBoxId: number) => {
    if (movingTradeId == null) return;
    try {
      const updated = await moveItem(boxId, movingTradeId, toBoxId);
      if (updated) {
        setMovingTradeId(null);
        setMode('view');
        await load();
      }
    } catch {
      // toast via hook
    }
  };

  const handleClose = async () => {
    try {
      const closed = await closeBox(boxId);
      if (closed) {
        setBox(closed);
        setClosedNumber(closed.number);
      }
    } catch {
      // toast via hook
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteBox(boxId);
      if (result?.status === 'deleted') {
        router.replace(`/boxes/out/${destinationId}`);
        return;
      }
      if (result?.status === 'has_items') {
        setShowDelete(false);
        let titles = result.titles;
        if (titles.length === 0) {
          const fresh = await getBox(boxId);
          titles = fresh.math_items.map((item) => item.title).filter(Boolean);
          setBox(fresh);
        }
        setAddedTitles(titles);
      }
    } catch {
      // toast via hook
    }
  };

  const handleAddedGamesAck = async () => {
    setAddedTitles(null);
    await load();
  };

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  const empty = (box?.math_items.length || 0) === 0;
  const canMutate = box ? isBoxOpen(box) : false;

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando caja..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !box && <StaffEmpty>Caja no encontrada.</StaffEmpty>}

      {box && mode === 'view' && (
        <>
          <p className="text-sm text-gray-500">
            {box.destination_name} · la abrió {packerName(box)} · {box.math_items.length} juegos
          </p>

          {box.math_items.length === 0 ? (
            <StaffEmpty>La caja está vacía. Agregá juegos listos de este destino.</StaffEmpty>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {box.math_items.map((item) => (
                <li key={item.id} className="rounded-lg bg-white">
                  <GameRow
                    title={`${item.assigned_trade_code} · ${item.title}`}
                    subtitle={receptorName(item) || undefined}
                  />
                  {canMutate && (
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      <button
                        type="button"
                        disabled={inFlight}
                        onClick={() => setRemoveTarget(item)}
                        className="staff-btn staff-btn-outline"
                      >
                        Sacar
                      </button>
                      {openBoxes.length > 0 && (
                        <button
                          type="button"
                          disabled={inFlight}
                          onClick={() => {
                            setMovingTradeId(item.id);
                            setMode('move');
                          }}
                          className="staff-btn staff-btn-outline"
                        >
                          Mover a otra caja
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canMutate && (
            <button
              type="button"
              disabled={inFlight || availableItems.length === 0}
              onClick={() => setMode('add')}
              className="staff-btn staff-btn-outline mt-6"
            >
              Agregar juegos
            </button>
          )}

          {canMutate && empty && (
            <button
              type="button"
              disabled={inFlight}
              onClick={() => setShowDelete(true)}
              className="mt-6 flex min-h-14 w-full items-center justify-center text-base font-semibold text-danger"
            >
              Borrar caja vacía
            </button>
          )}
        </>
      )}

      {box && mode === 'add' && (
        <>
          <button
            type="button"
            onClick={() => setMode('view')}
            className="mb-4 min-h-14 text-base font-semibold text-gray-600"
          >
            Volver a la caja
          </button>
          {availableItems.length === 0 ? (
            <StaffEmpty>No hay juegos listos fuera de caja para este destino.</StaffEmpty>
          ) : (
            <ul className="flex flex-col gap-3">
              {availableItems.map((item) => {
                const checked = selectedAdds.has(item.id);
                return (
                  <li key={item.id}>
                    <GameRow
                      title={`${item.assigned_trade_code} · ${item.title}`}
                      subtitle={receptorName(item) || undefined}
                      onClick={() => toggleAdd(item.id)}
                      selected={checked}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <ThumbCta disabled={selectedAdds.size === 0 || inFlight} onClick={handleAdd}>
            Agregar ({selectedAdds.size})
          </ThumbCta>
        </>
      )}

      {box && mode === 'move' && movingTradeId != null && (
        <>
          <button
            type="button"
            onClick={() => {
              setMode('view');
              setMovingTradeId(null);
            }}
            className="mb-4 min-h-14 text-base font-semibold text-gray-600"
          >
            Volver a la caja
          </button>
          <p className="mb-3 text-sm text-gray-600">Elegí otra caja abierta del mismo destino.</p>
          <ul className="flex flex-col gap-3">
            {openBoxes.map((candidate) => (
              <li key={candidate.id}>
                <GameRow
                  title={openBoxTitle(candidate)}
                  subtitle={boxContentsSummary(candidate)}
                  onClick={() => handleMove(candidate.id)}
                  disabled={inFlight}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {box && mode === 'view' && canMutate && (
        <ThumbCta variant="primary" disabled={empty || inFlight} onClick={handleClose}>
          Cerrar caja
        </ThumbCta>
      )}

      <StaffDialog
        open={removeTarget != null}
        title="Sacar de la caja"
        confirmLabel="Sacar"
        variant="danger"
        confirmDisabled={inFlight}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      >
        {removeTarget && `¿Sacar ${removeTarget.title} de esta caja?`}
      </StaffDialog>

      <StaffDialog
        open={showDelete}
        title="Borrar caja vacía"
        confirmLabel="Borrar"
        variant="danger"
        confirmDisabled={inFlight}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      >
        Solo se puede borrar una caja abierta y vacía.
      </StaffDialog>

      <StaffDialog
        open={addedTitles != null}
        title={`Ya se agregaron los siguientes juegos: ${addedTitles?.join(', ')}`}
        confirmLabel="OK"
        confirmDisabled={isLoading}
        onConfirm={handleAddedGamesAck}
      />

      <StaffDialog
        open={closedNumber != null}
        title="Vas a escribir este número"
        confirmLabel="Listo"
        onConfirm={() => {
          setClosedNumber(null);
          router.replace(`/boxes/out/${destinationId}`);
        }}
      >
        {closedNumber != null && (
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900">#{closedNumber}</p>
            <p className="mt-3">
              Escribí el #{closedNumber} en la caja física a {box?.destination_name}. {box?.math_items.length} juegos.
            </p>
          </div>
        )}
      </StaffDialog>
    </StaffPage>
  );
}
