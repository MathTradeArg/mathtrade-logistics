"use client";

import AddByCodeField, { type AddByCodeResult } from '@/components/boxes/AddByCodeField';
import { GameRow, StaffDialog, StaffEmpty, StaffPage, ThumbCta } from '@/components/staff';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { resolveCodeToAdd } from '@/hooks/boxes/addByCode';
import { addItem as addItemApi, listBoxes, listItems, markItemsReceived } from '@/hooks/boxes/boxApi';
import { boxLaneDestination, findBoxForTrade, isBoxOpen, receptorName } from '@/hooks/boxes/boxGrouping';
import { boxErrorMessage, useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import type { Box, Item } from '@/types';
import { formatTradeCode } from '@/utils/tradeCode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'view' | 'add' | 'move';

/** Whether a game fits this box's destination (the API's add rule): a box
 *  from a city to AMBA takes via_meeting games (they go through the event)
 *  and games that stay in AMBA; any other box takes games for its lane. */
function fitsBoxDestination(item: Item, box: Box): boolean {
  const lane = item.lane_destination ?? item.location;
  if (box.destiny === EVENT_LOCATION_ID) {
    return Boolean(item.via_meeting) || lane === EVENT_LOCATION_ID;
  }
  return lane === boxLaneDestination(box);
}

/** A box reopened at the event to rebuild it (transit, or from a city to
 *  AMBA in a shipment): add, remove and move
 *  games, mark every game received at the event (also the ones going on to
 *  other cities), and close it again. */
export default function TransitBoxView({
  box,
  onReload,
  userId,
}: {
  box: Box;
  onReload: () => Promise<void>;
  userId: string | number | null;
}) {
  const { inFlight, addItems, removeItem, moveItem, closeBox } = useBoxLifecycle();
  const { setError } = useActionStatus();
  const [receivingCode, setReceivingCode] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [destBoxes, setDestBoxes] = useState<Box[]>([]);
  const [openSiblings, setOpenSiblings] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedAdds, setSelectedAdds] = useState<Set<number>>(new Set());
  const [movingTradeId, setMovingTradeId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Item | null>(null);
  const [closedNumber, setClosedNumber] = useState<number | null>(null);

  const canMutate = isBoxOpen(box);
  // What the box holds after the last add-by-code POST: the next queued code
  // must see that copy before the parent reloads the box.
  const boxItemsRef = useRef(box.math_items);
  const propItemsRef = useRef(box.math_items);
  if (propItemsRef.current !== box.math_items) {
    propItemsRef.current = box.math_items;
    boxItemsRef.current = box.math_items;
  }
  const addedByCodeRef = useRef(0);

  const loadExtras = useCallback(async () => {
    const [nextDestBoxes, destItems] = await Promise.all([
      listBoxes({ destination: box.destiny }),
      listItems({ destination: box.destiny, origin: box.origin }),
    ]);
    setDestBoxes(nextDestBoxes);
    setOpenSiblings(
      nextDestBoxes.filter((candidate) => candidate.id !== box.id && isBoxOpen(candidate) && candidate.origin === box.origin),
    );
    setItems(destItems);
  }, [box.destiny, box.id, box.origin]);

  useEffect(() => {
    loadExtras().catch(() => undefined);
  }, [loadExtras]);

  const availableItems = useMemo(() => {
    const inThisBox = new Set(box.math_items.map((item) => item.id));
    return items.filter((item) => {
      if (!(item.status === 4 || item.status === 5)) return false;
      if (!fitsBoxDestination(item, box) || item.origin_location !== box.origin) return false;
      if (inThisBox.has(item.id)) return false;
      const source = findBoxForTrade(destBoxes, item.id);
      if (!source) return true;
      if (isBoxOpen(source)) return false;
      return source.origin === box.origin && boxLaneDestination(source) === boxLaneDestination(box);
    });
  }, [box, destBoxes, items]);

  const sourceLabel = (item: Item) => {
    const source = findBoxForTrade(destBoxes, item.id);
    if (!source || source.id === box.id) return null;
    return source.number != null ? `Caja #${source.number}` : 'Otra caja abierta';
  };

  const toggleAdd = (tradeId: number) => {
    setSelectedAdds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) next.delete(tradeId);
      else next.add(tradeId);
      return next;
    });
  };

  const handleReceive = async (item: Item) => {
    if (receivingCode != null) return;
    setReceivingCode(item.assigned_trade_code);
    try {
      await markItemsReceived([item.assigned_trade_code], userId);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar el juego.');
    } finally {
      setReceivingCode(null);
    }
  };

  const handleAdd = async () => {
    if (selectedAdds.size === 0) return;
    try {
      await addItems(box.id, Array.from(selectedAdds));
      setSelectedAdds(new Set());
      setMode('view');
      await onReload();
      await loadExtras();
    } catch {
      // toast via hook
    }
  };

  const handleAddByCode = async (code: string): Promise<AddByCodeResult> => {
    const resolution = resolveCodeToAdd(code, {
      items,
      available: availableItems,
      boxItems: boxItemsRef.current,
      otherBoxes: destBoxes.filter((candidate) => candidate.id !== box.id),
      requirePackable: false,
    });
    if (resolution.kind === 'error') return { ok: false, message: resolution.message };
    try {
      // Straight to the API, not lifecycle.addItem: runExclusive drops calls
      // while another runs, and the field already queues them one by one.
      const updated = await addItemApi(box.id, resolution.item.id);
      boxItemsRef.current = updated.math_items;
      addedByCodeRef.current += 1;
      return {
        ok: true,
        message: `Agregado: ${formatTradeCode(resolution.item.assigned_trade_code)} · ${resolution.item.title}`,
      };
    } catch (err) {
      return { ok: false, message: boxErrorMessage(err) || 'No se pudo agregar el juego.' };
    }
  };

  const handleAddByCodeIdle = async () => {
    if (addedByCodeRef.current === 0) return;
    addedByCodeRef.current = 0;
    try {
      await onReload();
      await loadExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recargar la caja.');
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      const ok = await removeItem(box.id, removeTarget.id);
      if (ok) {
        setRemoveTarget(null);
        await onReload();
        await loadExtras();
      }
    } catch {
      // toast via hook
    }
  };

  const handleMove = async (toBoxId: number) => {
    if (movingTradeId == null) return;
    try {
      await moveItem(box.id, movingTradeId, toBoxId);
      setMovingTradeId(null);
      setMode('view');
      await onReload();
      await loadExtras();
    } catch {
      // toast via hook
    }
  };

  const handleClose = async () => {
    try {
      const updated = await closeBox(box.id);
      if (updated) {
        // The parent reloads on "Listo": reloading now would unmount this
        // view (the box is closed) before the number is shown.
        setClosedNumber(updated.number);
      }
    } catch {
      // toast via hook
    }
  };

  return (
    <StaffPage className="pb-28">
      <p className="text-sm text-gray-500">{box.origin_name} → {box.destination_name}</p>
      <p className="mt-2 text-sm text-gray-600">
        Caja reabierta para rearmar. Marcá todos los juegos como recibidos.
      </p>

      {mode === 'view' && (
        <>
          {canMutate && <AddByCodeField onSubmit={handleAddByCode} onIdle={handleAddByCodeIdle} />}

          {box.math_items.length === 0 ? (
            <StaffEmpty>La caja está vacía.</StaffEmpty>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {box.math_items.map((item) => (
                <li key={item.id} className="rounded-lg bg-white">
                  <GameRow
                    title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                    subtitle={receptorName(item) || undefined}
                  />
                  {canMutate && (
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      {item.status !== 5 && item.status !== 6 && (
                        <button
                          type="button"
                          disabled={inFlight || receivingCode != null}
                          onClick={() => handleReceive(item)}
                          className="staff-btn staff-btn-outline"
                        >
                          Marcar recibido
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={inFlight}
                        onClick={() => setRemoveTarget(item)}
                        className="staff-btn staff-btn-outline"
                      >
                        Sacar
                      </button>
                      {openSiblings.length > 0 && (
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
        </>
      )}

      {mode === 'add' && (
        <>
          <button
            type="button"
            onClick={() => setMode('view')}
            className="mb-4 min-h-14 text-base font-semibold text-gray-600"
          >
            Volver a la caja
          </button>
          {availableItems.length === 0 ? (
            <StaffEmpty>No hay más juegos de este origen y destino.</StaffEmpty>
          ) : (
            <ul className="flex flex-col gap-3">
              {availableItems.map((item) => {
                const checked = selectedAdds.has(item.id);
                return (
                  <li key={item.id}>
                    <GameRow
                      title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                      subtitle={[receptorName(item) || null, sourceLabel(item)].filter(Boolean).join(' · ') || undefined}
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

      {mode === 'move' && movingTradeId != null && (
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
          <p className="mb-3 text-sm text-gray-600">Elegí otra caja abierta del mismo origen y destino.</p>
          <ul className="flex flex-col gap-3">
            {openSiblings.map((candidate) => (
              <li key={candidate.id}>
                <GameRow
                  title={candidate.number != null ? `#${candidate.number}` : 'Caja abierta'}
                  subtitle={`${candidate.math_items.length} juegos`}
                  onClick={() => handleMove(candidate.id)}
                  disabled={inFlight}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {mode === 'view' && canMutate && (
        <ThumbCta variant="primary" disabled={box.math_items.length === 0 || inFlight} onClick={handleClose}>
          Cerrar de nuevo
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
        open={closedNumber != null}
        title="Se cierra con el mismo número"
        confirmLabel="Listo"
        onConfirm={() => {
          setClosedNumber(null);
          onReload().catch(() => undefined);
        }}
      >
        {closedNumber != null && (
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900">#{closedNumber}</p>
            <p className="mt-3">
              Sigue siendo #{closedNumber} de {box.origin_name} a {box.destination_name}.
            </p>
          </div>
        )}
      </StaffDialog>
    </StaffPage>
  );
}
