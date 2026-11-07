"use client";

import { useActionStatus } from '@/contexts/ActionStatusContext';
import {
  addItem as addItemApi,
  BoxApiError,
  closeBox as closeBoxApi,
  concurrentAddTitles,
  deleteBox as deleteBoxApi,
  getBox as getBoxApi,
  moveItem as moveItemApi,
  openBox as openBoxApi,
  removeItem as removeItemApi,
  reopenBox as reopenBoxApi,
} from '@/hooks/boxes/boxApi';
import type { Box } from '@/types';
import { useCallback, useRef, useState } from 'react';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const BOX_ERROR_ES: Record<string, string> = {
  'Trade is already in another box.': 'Ese juego ya está en otra caja.',
  'Trade is not packable.': 'Ese juego no se puede poner en esta caja.',
  'Cannot add items to a closed box.': 'No se pueden agregar juegos a una caja cerrada.',
  'Trade destination does not match the box.': 'Ese juego no va a este destino.',
  'Cannot reopen a box that is already in a shipment.': 'Esa caja ya está en un envío y no se puede reabrir.',
  'Trade not found.': 'Ese juego no existe.',
  'Trade is not in this box.': 'Ese juego ya no está en esta caja.',
  'Cannot remove items from a closed box.': 'La caja está cerrada: reabrila para sacar juegos.',
  'Cannot move items unless both boxes are open.': 'Las dos cajas tienen que estar abiertas.',
  'Boxes have different destinations.': 'Las cajas tienen distinto destino.',
  'Cannot close an empty box.': 'No se puede cerrar una caja vacía.',
  'Destination box not found.': 'No se encontró la caja de destino.',
  'Only event staff can reopen a box that is already in a shipment.':
    'Solo el staff del evento puede reabrir una caja que ya está en un envío.',
  'Cannot delete a closed box.': 'No se puede borrar una caja cerrada.',
  'Not found.': 'No se encontró la caja.',
  'You do not have permission to perform this action.': 'No tenés permiso para hacer esto.',
  'Invalid token.': 'Tu sesión expiró. Volvé a iniciar sesión.',
  'Authentication credentials were not provided.': 'Tu sesión expiró. Volvé a iniciar sesión.',
};

function errorMessage(err: unknown): string {
  if (err instanceof BoxApiError) return BOX_ERROR_ES[err.message] || err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error desconocido.';
}

/** The server's box error in Spanish (same texts as the lifecycle toasts). */
export const boxErrorMessage = errorMessage;

export type AddItemsFailure = { tradeId: number; reason: string };

export type AddItemsResult = {
  /** The last box the API returned (null if no game went in). */
  box: Box | null;
  /** Trade ids that went in, in the order given. */
  added: number[];
  /** Trade ids that did not, in the order given, with the reason in Spanish. */
  failed: AddItemsFailure[];
};

/** Errors after which the next games would fail the same way: stop the batch
 *  (a dead network would cost a 15 s timeout per game). */
function batchStopReason(err: unknown): string | null {
  if (!(err instanceof BoxApiError)) return null;
  if (err.status === 0) return 'No se intentó: sin conexión.';
  if (err.status === 401 || err.status === 403) return 'No se intentó: sin permiso.';
  return null;
}

const gamesLabel = (count: number) => (count === 1 ? 'juego agregado' : 'juegos agregados');

export type DeleteBoxResult =
  | { status: 'deleted' }
  | { status: 'has_items'; titles: string[] };

export function useBoxLifecycle() {
  const { setError, setSuccess, clearMessages } = useActionStatus();
  const [inFlight, setInFlight] = useState(false);
  const inFlightRef = useRef(false);
  const openKeyRef = useRef<string | null>(null);
  const closeKeyRef = useRef<string | null>(null);

  const runExclusive = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setInFlight(true);
    clearMessages();
    try {
      return await fn();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw err;
    } finally {
      inFlightRef.current = false;
      setInFlight(false);
    }
  }, [clearMessages, setError]);

  const openBox = useCallback(async (destinationId: number, originId: number): Promise<Box | null> => {
    return runExclusive(async () => {
      if (!openKeyRef.current) {
        openKeyRef.current = newIdempotencyKey();
      }
      const box = await openBoxApi(destinationId, originId, openKeyRef.current);
      openKeyRef.current = null;
      setSuccess('Caja abierta.');
      return box;
    });
  }, [runExclusive, setSuccess]);

  const addItem = useCallback(async (boxId: number, tradeId: number): Promise<Box | null> => {
    return runExclusive(async () => {
      const box = await addItemApi(boxId, tradeId);
      setSuccess('Juego agregado a la caja.');
      return box;
    });
  }, [runExclusive, setSuccess]);

  /** Adds the games one by one and keeps going after a game fails (not all
   *  or nothing); stops on a dead network or a session/permission error.
   *  Never throws for a game: the result says what went in and what not. */
  const addItems = useCallback(async (boxId: number, tradeIds: number[]): Promise<AddItemsResult | null> => {
    return runExclusive(async () => {
      const result: AddItemsResult = { box: null, added: [], failed: [] };
      for (let index = 0; index < tradeIds.length; index += 1) {
        const tradeId = tradeIds[index];
        try {
          result.box = await addItemApi(boxId, tradeId);
          result.added.push(tradeId);
        } catch (err) {
          result.failed.push({ tradeId, reason: errorMessage(err) });
          const stop = batchStopReason(err);
          if (stop) {
            tradeIds.slice(index + 1).forEach((rest) => result.failed.push({ tradeId: rest, reason: stop }));
            break;
          }
        }
      }
      const added = result.added.length;
      if (result.failed.length === 0) {
        setSuccess(`${added} ${gamesLabel(added)} a la caja.`);
      } else if (added === 0) {
        setError('No se pudo agregar ningún juego.');
      } else {
        setError(`Se agregaron ${added} de ${tradeIds.length} juegos.`);
      }
      return result;
    });
  }, [runExclusive, setError, setSuccess]);

  const removeItem = useCallback(async (boxId: number, tradeId: number): Promise<boolean> => {
    const result = await runExclusive(async () => {
      await removeItemApi(boxId, tradeId);
      setSuccess('Juego sacado de la caja.');
      return true;
    });
    return result === true;
  }, [runExclusive, setSuccess]);

  const moveItem = useCallback(
    async (boxId: number, tradeId: number, toBoxId: number): Promise<Box | null> => {
      return runExclusive(async () => {
        const box = await moveItemApi(boxId, tradeId, toBoxId);
        setSuccess('Juego movido a otra caja.');
        return box;
      });
    },
    [runExclusive, setSuccess],
  );

  const closeBox = useCallback(async (boxId: number): Promise<Box | null> => {
    return runExclusive(async () => {
      if (!closeKeyRef.current) {
        closeKeyRef.current = newIdempotencyKey();
      }
      const box = await closeBoxApi(boxId, closeKeyRef.current);
      closeKeyRef.current = null;
      return box;
    });
  }, [runExclusive]);

  const reopenBox = useCallback(async (boxId: number): Promise<Box | null> => {
    return runExclusive(async () => {
      const box = await reopenBoxApi(boxId);
      setSuccess('Caja reabierta. Conserva el número.');
      return box;
    });
  }, [runExclusive, setSuccess]);

  const deleteBox = useCallback(async (boxId: number): Promise<DeleteBoxResult | null> => {
    return runExclusive(async () => {
      const latest = await getBoxApi(boxId);
      const currentTitles = latest.math_items.map((item) => item.title).filter(Boolean);
      if (currentTitles.length > 0 || latest.math_items.length > 0) {
        return { status: 'has_items' as const, titles: currentTitles };
      }
      try {
        await deleteBoxApi(boxId);
        setSuccess('Caja eliminada.');
        return { status: 'deleted' as const };
      } catch (err) {
        const titles = concurrentAddTitles(err);
        if (titles) {
          return { status: 'has_items' as const, titles };
        }
        throw err;
      }
    });
  }, [runExclusive, setSuccess]);

  return {
    inFlight,
    openBox,
    addItem,
    addItems,
    removeItem,
    moveItem,
    closeBox,
    reopenBox,
    deleteBox,
  };
}
