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
};

function errorMessage(err: unknown): string {
  if (err instanceof BoxApiError) return BOX_ERROR_ES[err.message] || err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error desconocido.';
}

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

  const openBox = useCallback(async (destinationId: number): Promise<Box | null> => {
    return runExclusive(async () => {
      if (!openKeyRef.current) {
        openKeyRef.current = newIdempotencyKey();
      }
      const box = await openBoxApi(destinationId, openKeyRef.current);
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

  const addItems = useCallback(async (boxId: number, tradeIds: number[]): Promise<Box | null> => {
    return runExclusive(async () => {
      let last: Box | null = null;
      for (const tradeId of tradeIds) {
        last = await addItemApi(boxId, tradeId);
      }
      const label = tradeIds.length === 1 ? 'juego' : 'juegos';
      setSuccess(`${tradeIds.length} ${label} agregados a la caja.`);
      return last;
    });
  }, [runExclusive, setSuccess]);

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
