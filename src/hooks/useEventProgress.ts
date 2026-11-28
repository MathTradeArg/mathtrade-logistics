"use client";

import { useEffect } from 'react';
import { useApi } from './useApi';

export type ProgressCount = { done: number; total: number };

export type EventProgress = {
  reception: {
    games: ProgressCount;
    users: ProgressCount;
    interior_games: ProgressCount;
    boxes: ProgressCount;
  };
  delivery: { games: ProgressCount; users: ProgressCount; ready: ProgressCount };
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
