/** A copy's label number (assigned_trade_code) as people write it: padded to
 *  at least 4 digits and never cut, so 12 -> "0012" and 12345 stays "12345".
 *  (The web area's old codeNumToString kept only the last 4 digits.) */
export function formatTradeCode(code: number | string | null | undefined): string {
  if (code === null || code === undefined || `${code}`.trim() === '') return '—';
  return `${code}`.trim().padStart(4, '0');
}

/** Box label of a copy from the items list: `<origin_number>-<number>`, the
 *  number alone for boxes without an origin sequence, or "—" when unboxed. */
export function itemBoxLabel(item: {
  box_number?: number | string | null;
  box_origin_number?: number | null;
}): string {
  const number = item.box_number;
  if (number === null || number === undefined || `${number}` === '') return '—';
  if (item.box_origin_number != null) return `${item.box_origin_number}-${number}`;
  return `${number}`;
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

/** ARS amount as the web area showed it, or "—" when there is none. */
export function formatMoney(value: number | null | undefined): string {
  return value == null ? '—' : money.format(value);
}

/** Price per game of a shipment, or "—" when the price or the count is 0. */
export function pricePerItem(price: number | null | undefined, count: number): string {
  return price && count > 0 ? money.format(price / count) : '—';
}
