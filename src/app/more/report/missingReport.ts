type MissingItem = {
  item_id?: number;
  title: string;
  assigned_trade_code: number;
};

export function missingReportHref(opts: {
  boxId: number;
  boxNumber?: number | null;
  originName?: string;
  items?: MissingItem[];
}): string {
  const params = new URLSearchParams();
  params.set('kind', 'missing');
  params.set('box', String(opts.boxId));
  if (opts.boxNumber != null) params.set('boxNumber', String(opts.boxNumber));
  if (opts.originName) params.set('origin', opts.originName);
  const items = opts.items || [];
  if (items.length === 1) {
    const item = items[0];
    if (item.item_id) params.set('item', String(item.item_id));
    params.set('code', String(item.assigned_trade_code));
    params.set('title', item.title);
  } else if (items.length > 1) {
    params.set('codes', items.map((item) => item.assigned_trade_code).join(','));
    if (items[0].item_id) params.set('item', String(items[0].item_id));
  }
  return `/more/report?${params.toString()}`;
}

export function missingReportComment(opts: {
  boxId: number;
  boxNumber?: number | null;
  originName?: string;
  itemId?: number | null;
  title?: string;
  code?: string;
  codes?: string;
}): string {
  const boxLabel = opts.boxNumber != null ? `#${opts.boxNumber}` : `id ${opts.boxId}`;
  const origin = opts.originName ? ` de ${opts.originName}` : '';
  const lines = [`Faltante en caja ${boxLabel}${origin}.`, `Caja id ${opts.boxId}.`];
  if (opts.itemId) lines.push(`Item id ${opts.itemId}.`);
  if (opts.title && opts.code) lines.push(`Juego: ${opts.title} (#${opts.code}).`);
  else if (opts.codes) lines.push(`Etiquetas: ${opts.codes}.`);
  return lines.join('\n');
}
