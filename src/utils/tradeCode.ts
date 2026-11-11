/** A copy's label number (assigned_trade_code) as printed on the sticker:
 *  at least 5 digits and never cut, so 12 -> "00012" and 16120 stays "16120". */
export function formatTradeCode(code: number | string | null | undefined): string {
  if (code === null || code === undefined || `${code}`.trim() === '') return '—';
  return `${code}`.trim().padStart(5, '0');
}

/** Padded label plus the number without zeros, so "10", "010" and "00010" all match. */
export function tradeCodeSearchText(code: number | string | null | undefined): string {
  const padded = formatTradeCode(code);
  if (padded === '—') return '';
  const bare = padded.replace(/^0+/, '') || '0';
  return bare === padded ? padded : `${padded} ${bare}`;
}

/** A typed label: drops a leading # and leading zeros. " #0010 " -> "10".
 *  Anything that isn't a number comes back null. */
export function parseTradeCodeQuery(raw: string): string | null {
  const digits = raw.trim().replace(/^#/, '');
  if (!/^\d+$/.test(digits)) return null;
  return String(Number(digits));
}

/** Box label of a copy from the items list: simple number, or "—" when unboxed. */
export function itemBoxLabel(item: {
  box_number?: number | string | null;
  box_origin_number?: number | null;
}): string {
  const number = item.box_number;
  if (number === null || number === undefined || `${number}` === '') return '—';
  return `${number}`;
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

/** ARS amount as the web area showed it, or "—" when there is none. */
export function formatMoney(value: number | null | undefined): string {
  return value == null ? '—' : money.format(value);
}

/** Total size units of a shipment's games (a combo counts the sum of its items). */
export function trackingUnits(boxes: { math_items: { size_units?: number }[] }[]): number {
  return boxes.reduce(
    (total, box) => total + box.math_items.reduce((sum, item) => sum + (item.size_units ?? 0), 0),
    0,
  );
}

/** A game's share of the shipment price, proportional to its size units, or "—"
 *  when there is no price or the shipment has no units. */
export function itemShippingCost(
  price: number | null | undefined,
  units: number | undefined,
  totalUnits: number,
): string {
  return price && totalUnits > 0 ? money.format((price * (units ?? 0)) / totalUnits) : '—';
}

/** The giver's full name, or "—" when the copy carries none. */
export const giverName = (item: { first_name?: string; last_name?: string }): string =>
  `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || '—';
