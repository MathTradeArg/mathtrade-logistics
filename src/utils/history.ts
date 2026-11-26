import { getGameStatusText, type ActivityRow, type BoxAction, type BoxEventRow, type GameStatusCode } from '@/types';
import { formatTradeCode } from '@/utils/tradeCode';

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

export const BOX_ACTION_LABEL: Record<BoxAction, string> = {
  create: 'Creó la caja',
  add: 'Agregó un juego',
  remove: 'Sacó un juego',
  move_in: 'Movió un juego a esta caja',
  move_out: 'Movió un juego a otra caja',
  close: 'Cerró la caja',
  reopen: 'Reabrió la caja',
  delete: 'Borró la caja',
};

const BOX_ACTIONS_WITHOUT_GAME: ReadonlySet<BoxAction> = new Set(['create', 'close', 'reopen', 'delete']);

/** "Catan (00101)", or "Juego no disponible" when a game action has no game
 *  (deleted). null for box actions that are not about a game. */
export function boxEventGameText(row: Pick<BoxEventRow, 'trade_code' | 'game_title' | 'action'>): string | null {
  if (row.trade_code === null) {
    return BOX_ACTIONS_WITHOUT_GAME.has(row.action) ? null : 'Juego no disponible';
  }
  return `${row.game_title ?? 'Sin título'} (${formatTradeCode(row.trade_code)})`;
}

/** Trade and box rows come from different tables: their ids can repeat. */
export const activityKey = (row: ActivityRow) => `${row.kind}-${row.id}`;

/** "Catan (00101): En evento" or "Agregó un juego (caja 392) · Catan (00101)". */
export function activityTitle(row: ActivityRow): string {
  if (row.kind === 'trade') {
    return `${row.game_title ?? 'Sin título'} (${formatTradeCode(row.trade_code)}): ${getGameStatusText(row.status)}`;
  }
  const game = boxEventGameText(row);
  const text = `${BOX_ACTION_LABEL[row.action]} (caja ${row.box_id})`;
  return game ? `${text} · ${game}` : text;
}
