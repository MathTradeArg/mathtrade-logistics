import { findBoxForTrade } from '@/hooks/boxes/boxGrouping';
import type { Box, Item } from '@/types';
import type { AddItemsResult } from '@/hooks/boxes/useBoxLifecycle';
import { formatTradeCode, parseTradeCodeQuery } from '@/utils/tradeCode';

export type CodeResolution =
  | { kind: 'add'; item: Item }
  | { kind: 'error'; message: string };

export type CodeResolutionContext = {
  /** Every candidate the screen loaded for this destination. */
  items: Item[];
  /** The ones that can be added now (already filtered by the screen). */
  available: Item[];
  /** What the box holds right now. */
  boxItems: Pick<Item, 'id' | 'assigned_trade_code'>[];
  /** Other boxes of the lane, to name the box a copy is in. */
  otherBoxes: Box[];
  /** Hub boxes: only copies marked received at the event (status 5). */
  requirePackable: boolean;
};

export const ADD_BY_CODE_ERRORS = {
  notDigits: 'Escribí el número de la etiqueta (solo dígitos).',
  inThisBox: 'Ese juego ya está en esta caja.',
  inOpenBox: 'Ese juego ya está en otra caja abierta.',
  notReceived: 'Ese juego todavía no se marcó como recibido en el evento.',
  otherDestination: 'Ese juego no va a este destino.',
  unknown: 'Ese código no existe o no es de este destino.',
} as const;

const hasCode = (code: string) => (item: Pick<Item, 'assigned_trade_code'>) =>
  String(item.assigned_trade_code) === code;

const present = (value: unknown) => value !== null && value !== undefined && `${value}` !== '';

/** Which copy a typed label code adds to the box, or why it can't be added.
 *  The label code (assigned_trade_code) is unique per copy. */
export function resolveCodeToAdd(raw: string, ctx: CodeResolutionContext): CodeResolution {
  const code = parseTradeCodeQuery(raw);
  if (code === null) return { kind: 'error', message: ADD_BY_CODE_ERRORS.notDigits };
  const matches = hasCode(code);

  if (ctx.boxItems.some(matches)) return { kind: 'error', message: ADD_BY_CODE_ERRORS.inThisBox };

  const addable = ctx.available.find(matches);
  if (addable) return { kind: 'add', item: addable };

  const item =
    ctx.items.find(matches) ??
    ctx.otherBoxes.flatMap((box) => box.math_items).find(matches);
  if (!item) return { kind: 'error', message: ADD_BY_CODE_ERRORS.unknown };

  const holder = findBoxForTrade(ctx.otherBoxes, item.id);
  if (holder) {
    return {
      kind: 'error',
      message: holder.number != null ? `Ese juego ya está en la caja #${holder.number}.` : ADD_BY_CODE_ERRORS.inOpenBox,
    };
  }
  if (present(item.box_number)) {
    return { kind: 'error', message: `Ese juego ya está en la caja #${item.box_number}.` };
  }

  if (ctx.requirePackable && item.status !== 5) {
    return { kind: 'error', message: ADD_BY_CODE_ERRORS.notReceived };
  }
  return { kind: 'error', message: ADD_BY_CODE_ERRORS.otherDestination };
}

export type AddSummary = {
  /** Trade ids that are in the box after the batch. */
  added: number[];
  /** Games that did not go in: "code · title: reason". */
  failed: { tradeId: number; line: string }[];
};

/** What a batch did, trusting the box reloaded afterwards: a game whose POST
 *  failed (e.g. timed out after the server saved it) but that is in the box
 *  counts as added. */
export function summarizeAdd(result: AddItemsResult, boxAfter: Box | null, items: Item[]): AddSummary {
  const inBox = new Set((boxAfter?.math_items ?? []).map((item) => item.id));
  const added = [...result.added];
  const failed: AddSummary['failed'] = [];
  result.failed.forEach(({ tradeId, reason }) => {
    if (inBox.has(tradeId)) {
      added.push(tradeId);
      return;
    }
    const item = items.find((candidate) => candidate.id === tradeId);
    const label = item ? `${formatTradeCode(item.assigned_trade_code)} · ${item.title}` : `Juego ${tradeId}`;
    failed.push({ tradeId, line: `${label}: ${reason}` });
  });
  return { added, failed };
}
