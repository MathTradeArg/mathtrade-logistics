"use client";

import { GameRow, StaffDialog, StaffEmpty, StaffPage, ThumbCta } from '@/components/staff';
import { listBoxes, listItems } from '@/hooks/boxes/boxApi';
import { findBoxForTrade, isBoxOpen, receptorName } from '@/hooks/boxes/boxGrouping';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import type { Box, Item } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Mode = 'view' | 'add' | 'move';

export default function TransitBoxView({
  box,
  onReload,
}: {
  box: Box;
  onReload: () => Promise<void>;
}) {
  const { inFlight, addItems, removeItem, moveItem, closeBox, reopenBox } = useBoxLifecycle();
  const [mode, setMode] = useState<Mode>('view');
  const [destBoxes, setDestBoxes] = useState<Box[]>([]);
  const [openSiblings, setOpenSiblings] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedAdds, setSelectedAdds] = useState<Set<number>>(new Set());
  const [movingTradeId, setMovingTradeId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Item | null>(null);
  const [showRebuild, setShowRebuild] = useState(false);
  const [closedNumber, setClosedNumber] = useState<number | null>(null);

  const canMutate = isBoxOpen(box);

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
      if (item.location !== box.destiny || item.origin_location !== box.origin) return false;
      if (inThisBox.has(item.id)) return false;
      const source = findBoxForTrade(destBoxes, item.id);
      if (!source) return true;
      if (isBoxOpen(source)) return false;
      return source.origin === box.origin && source.destiny === box.destiny;
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

  const handleRebuild = async () => {
    try {
      const updated = await reopenBox(box.id);
      if (updated) {
        setShowRebuild(false);
        await onReload();
        await loadExtras();
      }
    } catch {
      // toast via hook
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
        setClosedNumber(updated.number);
        await onReload();
      }
    } catch {
      // toast via hook
    }
  };

  return (
    <StaffPage className="pb-28">
      <p className="text-sm text-gray-500">{box.origin_name} → {box.destination_name}</p>
      <p className="mt-2 text-sm text-gray-600">
        {canMutate
          ? 'Caja reabierta para rearmar. No marques estos juegos como recibidos.'
          : 'Esta caja sigue de largo: no hay que abrirla. Consultala o rearma si el físico hay que rehacerlo.'}
      </p>

      {mode === 'view' && (
        <>
          {box.math_items.length === 0 ? (
            <StaffEmpty>La caja está vacía.</StaffEmpty>
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
                      title={`${item.assigned_trade_code} · ${item.title}`}
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

      {mode === 'view' && !canMutate && (
        <ThumbCta variant="danger" disabled={inFlight} onClick={() => setShowRebuild(true)}>
          Rearmar caja
        </ThumbCta>
      )}

      {mode === 'view' && canMutate && (
        <ThumbCta variant="primary" disabled={box.math_items.length === 0 || inFlight} onClick={handleClose}>
          Cerrar de nuevo
        </ThumbCta>
      )}

      <StaffDialog
        open={showRebuild}
        title="Rearmar esta caja"
        confirmLabel="Rearmar"
        variant="danger"
        confirmDisabled={inFlight}
        onConfirm={handleRebuild}
        onCancel={() => setShowRebuild(false)}
      >
        Vas a abrir una caja que no debía abrirse. El #{box.number} se conserva. No marques los juegos como recibidos.
      </StaffDialog>

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
        onConfirm={() => setClosedNumber(null)}
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
