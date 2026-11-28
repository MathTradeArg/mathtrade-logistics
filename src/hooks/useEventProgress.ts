"use client";

import { useEffect } from 'react';
import { useApi } from './useApi';

export type EventProgress = {
  games: { received: number; total: number };
  users: { total: number; ready: number; received: number };
};

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function useEventProgress(enabled: boolean, intervalMs = 30000): EventProgress | null {
  const { data, execute } = useApi<EventProgress>('logistics/progress/');

  useEffect(() => {
    if (!enabled) return;
    const load = () => {
      execute().catch(() => undefined);
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, execute]);

  return data;
}
