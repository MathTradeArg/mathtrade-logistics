import { findBoxForTrade } from '@/hooks/boxes/boxGrouping';
import type { Box, Item } from '@/types';
import { parseTradeCodeQuery } from '@/utils/tradeCode';

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
