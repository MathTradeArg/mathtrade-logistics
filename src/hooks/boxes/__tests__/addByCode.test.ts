import { resolveCodeToAdd, summarizeAdd } from '../addByCode';
import type { Box, Item } from '@/types';

const item = (id: number, code: number, overrides: Partial<Item> = {}): Item => ({
  id,
  title: `Game ${id}`,
  assigned_trade_code: code,
  status: 5,
  ...overrides,
});

const box = (id: number, number: number | null, items: Item[]): Box => ({
  id,
  number,
  origin: 1,
  destiny: 2,
  origin_name: 'AMBA',
  destination_name: 'Mendoza',
  closed_at: null,
  math_items: items,
  created_by_username: null,
  created_by_first_name: null,
  created_by_last_name: null,
});

const ctx = (overrides: Partial<Parameters<typeof resolveCodeToAdd>[1]> = {}) => ({
  items: [] as Item[],
  available: [] as Item[],
  boxItems: [] as Item[],
  otherBoxes: [] as Box[],
  requirePackable: true,
  ...overrides,
});

describe('resolveCodeToAdd: the label code identifies one copy to add to the box', () => {
  const catan = item(21, 12, { title: 'Catan' });

  it.each(['00012', '#12', ' 12 '])('the label code %p adds that copy (zeros, # and spaces ignored)', (raw) => {
    const result = resolveCodeToAdd(raw, ctx({ items: [catan], available: [catan] }));
    expect(result).toEqual({ kind: 'add', item: catan });
  });

  it('two copies of the same title: the code picks the right copy', () => {
    const first = item(21, 12, { title: 'Catan' });
    const second = item(22, 13, { title: 'Catan' });
    const result = resolveCodeToAdd('13', ctx({ items: [first, second], available: [first, second] }));
    expect(result).toEqual({ kind: 'add', item: second });
  });

  it.each(['abc', '', '12a'])('a code that is not only digits (%p) asks for the label number', (raw) => {
    expect(resolveCodeToAdd(raw, ctx({ items: [catan], available: [catan] }))).toEqual({
      kind: 'error',
      message: 'Escribí el número de la etiqueta (solo dígitos).',
    });
  });

  it('a copy already in this box is not added again', () => {
    expect(resolveCodeToAdd('12', ctx({ items: [catan], available: [catan], boxItems: [catan] }))).toEqual({
      kind: 'error',
      message: 'Ese juego ya está en esta caja.',
    });
  });

  it('a copy in another open box names that box', () => {
    const other = box(50, 3, [catan]);
    expect(resolveCodeToAdd('12', ctx({ items: [catan], otherBoxes: [other] }))).toEqual({
      kind: 'error',
      message: 'Ese juego ya está en la caja #3.',
    });
  });

  it('a copy in another open box without a number says so', () => {
    const other = box(50, null, [catan]);
    expect(resolveCodeToAdd('12', ctx({ items: [catan], otherBoxes: [other] }))).toEqual({
      kind: 'error',
      message: 'Ese juego ya está en otra caja abierta.',
    });
  });

  it('a copy whose box is not listed uses the box number carried by the item', () => {
    const boxed = item(21, 12, { box_number: 7 });
    expect(resolveCodeToAdd('12', ctx({ items: [boxed] }))).toEqual({
      kind: 'error',
      message: 'Ese juego ya está en la caja #7.',
    });
  });

  it('at the hub a copy not yet marked received at the event cannot be added', () => {
    const notReceived = item(21, 12, { status: 4 });
    expect(resolveCodeToAdd('12', ctx({ items: [notReceived], requirePackable: true }))).toEqual({
      kind: 'error',
      message: 'Ese juego todavía no se marcó como recibido en el evento.',
    });
  });

  it('a copy of this destination list that goes to another lane is rejected', () => {
    expect(resolveCodeToAdd('12', ctx({ items: [catan], available: [] }))).toEqual({
      kind: 'error',
      message: 'Ese juego no va a este destino.',
    });
  });

  it('an unknown code says it does not exist or is not for this destination', () => {
    expect(resolveCodeToAdd('99', ctx({ items: [catan], available: [catan] }))).toEqual({
      kind: 'error',
      message: 'Ese código no existe o no es de este destino.',
    });
  });
});

// Rule: after a batch the screen trusts the reloaded box: a game whose POST
// timed out but that is in the box counts as added; each failed game is told
// by its label code, title and reason.
describe('summarizeAdd: what the reloaded box says about a batch', () => {
  const catan = item(21, 101, { title: 'Catan' });
  const azul = item(22, 102, { title: 'Azul' });
  const titulo = item(23, 103, { title: 'Titulo' });
  const items = [catan, azul, titulo];

  it('lists each failed game as "code · title: reason"', () => {
    const summary = summarizeAdd(
      { box: null, added: [21, 22], failed: [{ tradeId: 23, reason: 'Ese juego ya está en otra caja.' }] },
      box(10, null, [catan, azul]),
      items,
    );
    expect(summary).toEqual({
      added: [21, 22],
      failed: [{ tradeId: 23, line: '00103 · Titulo: Ese juego ya está en otra caja.' }],
    });
  });

  it('a failed game that is in the reloaded box counts as added (its answer was lost)', () => {
    const summary = summarizeAdd(
      {
        box: null,
        added: [21],
        failed: [
          { tradeId: 22, reason: 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.' },
          { tradeId: 23, reason: 'No se intentó: sin conexión.' },
        ],
      },
      box(10, null, [catan, azul]),
      items,
    );
    expect(summary.added).toEqual([21, 22]);
    expect(summary.failed).toEqual([{ tradeId: 23, line: '00103 · Titulo: No se intentó: sin conexión.' }]);
  });

  it('without a reloaded box it keeps what the API answered', () => {
    const summary = summarizeAdd(
      { box: null, added: [], failed: [{ tradeId: 99, reason: 'Ese juego no existe.' }] },
      null,
      items,
    );
    expect(summary).toEqual({ added: [], failed: [{ tradeId: 99, line: 'Juego 99: Ese juego no existe.' }] });
  });
});
