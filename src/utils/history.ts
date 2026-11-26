import { getGameStatusText, type GameStatusCode } from '@/types';

export function formatHistoryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const actorName = (actor: { name: string } | null): string =>
  actor?.name?.trim() || 'Alguien (sin nombre)';

/** Rows come newest first. For each row, the status of the next older row with
 *  the same key (same game), or null. Shown as "anterior → actual". */
export function previousStatuses<T extends { status: GameStatusCode }>(
  rows: T[], keyOf: (row: T) => string | number,
): (GameStatusCode | null)[] {
  return rows.map((row, i) => {
    const key = keyOf(row);
    for (let j = i + 1; j < rows.length; j += 1) {
      if (keyOf(rows[j]) === key) return rows[j].status;
    }
    return null;
  });
}

export function statusChangeText(status: GameStatusCode, previous: GameStatusCode | null): string {
  return previous === null
    ? getGameStatusText(status)
    : `${getGameStatusText(previous)} → ${getGameStatusText(status)}`;
}
