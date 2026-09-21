export type MissingItem = {
  item_id?: number;
  title: string;
  assigned_trade_code: number;
};

export function parseMissingItems(searchParams: { get: (key: string) => string | null }): MissingItem[] {
  const raw = searchParams.get('items');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.flatMap((entry) => {
          if (!entry || typeof entry !== 'object') return [];
          const row = entry as { item_id?: unknown; title?: unknown; assigned_trade_code?: unknown };
          const code = Number(row.assigned_trade_code);
          if (!Number.isFinite(code)) return [];
          const itemId = Number(row.item_id);
          return [{
            item_id: Number.isFinite(itemId) && itemId > 0 ? itemId : undefined,
            title: typeof row.title === 'string' && row.title.trim() ? row.title : `Item ${itemId || code}`,
            assigned_trade_code: code,
          }];
        });
      }
    } catch {
      // fall through to single-item params
    }
  }

  const itemId = Number(searchParams.get('item') || 0) || undefined;
  const title = searchParams.get('title');
  const code = Number(searchParams.get('code') || 0);
  if (itemId || title || code) {
    return [{
      item_id: itemId,
      title: title || `Item ${itemId || code}`,
      assigned_trade_code: code,
    }];
  }
  return [];
}

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
    params.set('items', JSON.stringify(items.map((item) => ({
      item_id: item.item_id ?? null,
      title: item.title,
      assigned_trade_code: item.assigned_trade_code,
    }))));
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
  items?: MissingItem[];
}): string {
  const boxLabel = opts.boxNumber != null ? `#${opts.boxNumber}` : `id ${opts.boxId}`;
  const origin = opts.originName ? ` de ${opts.originName}` : '';
  const lines = [`Faltante en caja ${boxLabel}${origin}.`, `Caja id ${opts.boxId}.`];
  const items = opts.items && opts.items.length > 0
    ? opts.items
    : (opts.itemId || opts.title || opts.code)
      ? [{
          item_id: opts.itemId || undefined,
          title: opts.title || '',
          assigned_trade_code: Number(opts.code || 0),
        }]
      : [];
  items.forEach((item) => {
    if (item.item_id) lines.push(`Item id ${item.item_id}.`);
    if (item.title && item.assigned_trade_code) {
      lines.push(`Juego: ${item.title} (#${item.assigned_trade_code}).`);
    }
  });
  return lines.join('\n');
}
