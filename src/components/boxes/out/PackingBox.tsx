"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffDialog, StaffEmpty, StaffError, StaffPage, StaffSearch, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { getBox, listBoxes, listItems, type CityViewParams } from '@/hooks/boxes/boxApi';
import { apiDestinationId, boxDestinationLabel, boxedTradeIds, boxContentsSummary, boxMatchesLane, isBoxOpen, isPackable, matchesSearch, openBoxTitle, packerName, packingDestinationId, packingItemSubtitle, receptorName, VIA_AMBA_DESTINATION_ID, VIA_AMBA_DESTINATION_LABEL } from '@/hooks/boxes/boxGrouping';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { formatTradeCode, tradeCodeSearchText } from '@/utils/tradeCode';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Mode = 'view' | 'add' | 'move';

export type PackingBoxProps = {
  /** Where the box leaves from: the hub at the event, the city elsewhere. */
  origin: number;
  destinationId: number;
  boxId: number;
  /** Route prefix of the destination/box screens (`/boxes/out`, `/city/boxes`). */
  basePath: string;
  /** Blocked while the event hasn't started (the event screens only). Also
   *  requires the event's packable status on the games to add. */
  phaseGated: boolean;
  /** Restricts the item list to this origin (city screens). */
  itemsOrigin?: number;
  /** Admin "Ver como": hides every write control. */
  readOnly?: boolean;
  /** Admin "Ver como" params for the lists (city screens). */
  viewParams?: CityViewParams;
};

/** One open box: add, remove and move games, close or delete it. */
export default function PackingBox({
  origin, destinationId, boxId, basePath, phaseGated, itemsOrigin, readOnly = false, viewParams,
}: PackingBoxProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { inFlight, addItems, removeItem, moveItem, closeBox, deleteBox } = useBoxLifecycle();

  const [box, setBox] = useState<Box | null>(null);
  const [openBoxes, setOpenBoxes] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [addQuery, setAddQuery] = useState('');
  const [selectedAdds, setSelectedAdds] = useState<Set<number>>(new Set());
  const [movingTradeId, setMovingTradeId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Item | null>(null);
  const [closedNumber, setClosedNumber] = useState<number | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [addedTitles, setAddedTitles] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blocked = phaseGated && eventPhase === 0;
  // Primitive deps: callers pass a fresh params object each render.
  const asLocation = viewParams?.as_location;
  const mathtrade = viewParams?.mathtrade;

  useStaffTitle(box?.number != null ? `#${box.number}` : 'Caja abierta');

  const physicalDestId = apiDestinationId(destinationId);

  const load = useCallback(async () => {
    if (!boxId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextBox, nextBoxes, nextItems] = await Promise.all([
        getBox(boxId),
        listBoxes({ destination: physicalDestId, origin, status: 'open', as_location: asLocation, mathtrade }),
        listItems({ destination: physicalDestId, origin: itemsOrigin, as_location: asLocation, mathtrade }),
      ]);
      setBox(nextBox);
      setOpenBoxes(
        nextBoxes.filter(
          (candidate) =>
            candidate.id !== boxId &&
            (origin === EVENT_LOCATION_ID || boxMatchesLane(candidate, destinationId)),
        ),
      );
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la caja.');
    } finally {
      setIsLoading(false);
    }
  }, [boxId, destinationId, physicalDestId, origin, itemsOrigin, asLocation, mathtrade]);

  useEffect(() => {
    if (!isAuthenticated || blocked) return;
    load();
  }, [isAuthenticated, blocked, load]);

  const effectiveLaneId = useMemo(() => {
    if (destinationId === VIA_AMBA_DESTINATION_ID) return VIA_AMBA_DESTINATION_ID;
    if (box && origin !== EVENT_LOCATION_ID && boxMatchesLane(box, VIA_AMBA_DESTINATION_ID) && box.math_items.length > 0) {
      return VIA_AMBA_DESTINATION_ID;
    }
    return destinationId || box?.destiny;
  }, [box, destinationId, origin]);

  const availableItems = useMemo(() => {
    if (!box) return [];
    const boxed = boxedTradeIds([box, ...openBoxes]);
    return items.filter(
      (item) =>
        isPackable(item, phaseGated) &&
        packingDestinationId(item, origin) === effectiveLaneId &&
        !boxed.has(item.id),
    );
  }, [box, items, openBoxes, phaseGated, origin, effectiveLaneId]);

  const filteredAvailableItems = useMemo(() => {
    if (!addQuery.trim()) return availableItems;
    return availableItems.filter((item) =>
      matchesSearch(
        [
          item.title,
          tradeCodeSearchText(item.assigned_trade_code),
          receptorName(item),
          item.location_name ?? '',
        ].join(' '),
        addQuery,
      ),
    );
  }, [availableItems, addQuery]);

  const boxDestLabel = box
    ? effectiveLaneId === VIA_AMBA_DESTINATION_ID
      ? VIA_AMBA_DESTINATION_LABEL
      : boxDestinationLabel(box, items)
    : '';

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
        router.replace(`${basePath}/${destinationId}`);
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

  if (authIsLoading || isAuthenticated === null || (phaseGated && isLoadingEventPhase)) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (blocked) {
    return <PhaseBlocked />;
  }

  const empty = (box?.math_items.length || 0) === 0;
  const canMutate = !readOnly && (box ? isBoxOpen(box) : false);

  return (
    <StaffPage className="pb-28">
      {isLoading && <LoadingSpinner message="Cargando caja..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !box && <StaffEmpty>Caja no encontrada.</StaffEmpty>}

      {box && mode === 'view' && (
        <>
          <p className="text-sm text-gray-500">
            {boxDestLabel} · la abrió {packerName(box)} · {box.math_items.length} juegos
          </p>

          {box.math_items.length === 0 ? (
            <StaffEmpty>La caja está vacía. Agregá juegos listos de este destino.</StaffEmpty>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {box.math_items.map((item) => (
                <li key={item.id} className="rounded-lg bg-white">
                  <GameRow
                    title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                    subtitle={packingItemSubtitle(item, origin)}
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
              onClick={() => {
                setAddQuery('');
                setMode('add');
              }}
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
            onClick={() => {
              setAddQuery('');
              setMode('view');
            }}
            className="mb-4 min-h-14 text-base font-semibold text-gray-600"
          >
            Volver a la caja
          </button>
          <div className="mb-4">
            <StaffSearch
              value={addQuery}
              onChange={(event) => setAddQuery(event.target.value)}
              placeholder="Buscar juego, código o receptor"
              aria-label="Buscar juego para agregar"
            />
          </div>
          {filteredAvailableItems.length === 0 ? (
            <StaffEmpty>
              {availableItems.length === 0
                ? 'No hay juegos listos fuera de caja para este destino.'
                : 'No hay juegos que coincidan con la búsqueda.'}
            </StaffEmpty>
          ) : (
            <ul className="flex flex-col gap-3">
              {filteredAvailableItems.map((item) => {
                const checked = selectedAdds.has(item.id);
                return (
                  <li key={item.id}>
                    <GameRow
                      title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                      subtitle={packingItemSubtitle(item, origin)}
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
          router.replace(`${basePath}/${destinationId}`);
        }}
      >
        {closedNumber != null && (
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900">#{closedNumber}</p>
            <p className="mt-3">
              Escribí el #{closedNumber} en la caja física a {boxDestLabel}. {box?.math_items.length} juegos.
            </p>
          </div>
        )}
      </StaffDialog>
    </StaffPage>
  );
}
