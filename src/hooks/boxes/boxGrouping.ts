import { EVENT_LOCATION_ID } from '@/constants/event';
import type { Box, Item } from '@/types';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchesSearch(haystack: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalizeText(haystack).includes(normalizeText(query));
}

export function isBoxOpen(box: Box): boolean {
  return box.closed_at == null;
}

export function hasPendingIncomingItems(box: Box): boolean {
  return box.math_items.some((item) => item.status !== 5 && item.status !== 6);
}

export function isTransitBox(box: Box, eventLocationId = EVENT_LOCATION_ID): boolean {
  return box.origin !== eventLocationId && box.destiny !== eventLocationId;
}

export function boxedTradeIds(boxes: Box[]): Set<number> {
  const ids = new Set<number>();
  boxes.forEach((box) => {
    box.math_items.forEach((item) => ids.add(item.id));
  });
  return ids;
}

export function receptorName(item: Item): string {
  return [item.receptor_first_name, item.receptor_last_name].filter(Boolean).join(' ').trim();
}

export function packerName(box: Box): string {
  const name = [box.created_by_first_name, box.created_by_last_name].filter(Boolean).join(' ').trim();
  return name || box.created_by_username || 'otro voluntario';
}

export function boxContentsSummary(box: Box, limit = 3): string {
  const titles = box.math_items.map((item) => item.title).filter(Boolean);
  if (titles.length === 0) return 'Vacía';
  const shown = titles.slice(0, limit);
  const extra = titles.length - shown.length;
  if (extra <= 0) return shown.join(', ');
  return `${shown.join(', ')} y ${extra} más`;
}

export function openBoxTitle(box: Box): string {
  return `Caja de ${packerName(box)}`;
}

export function openBoxSubtitle(box: Box): string {
  return `${boxContentsSummary(box)} · la abrió ${packerName(box)}`;
}

export function giverName(item: Item): string {
  return [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
}

export type OriginGroup = {
  originId: number;
  originName: string;
  boxCount: number;
  pendingCount: number;
};

export function groupIncomingByOrigin(boxes: Box[]): OriginGroup[] {
  const map = new Map<number, OriginGroup>();
  boxes.forEach((box) => {
    const current = map.get(box.origin) || {
      originId: box.origin,
      originName: box.origin_name || `Localidad ${box.origin}`,
      boxCount: 0,
      pendingCount: 0,
    };
    current.boxCount += 1;
    current.pendingCount += box.math_items.filter(
      (item) => item.status !== 5 && item.status !== 6,
    ).length;
    map.set(box.origin, current);
  });
  return Array.from(map.values()).sort((a, b) => a.originName.localeCompare(b.originName));
}

export type DestinationGroup = {
  destinationId: number;
  destinationName: string;
  readyCount: number;
  inOpenCount: number;
  closedBoxCount: number;
};

export function groupPackingDestinations(items: Item[], boxes: Box[]): DestinationGroup[] {
  const boxed = boxedTradeIds(boxes);
  const openBoxed = boxedTradeIds(boxes.filter(isBoxOpen));
  const closedBoxesByDest = new Map<number, number>();
  boxes.filter((box) => !isBoxOpen(box)).forEach((box) => {
    closedBoxesByDest.set(box.destiny, (closedBoxesByDest.get(box.destiny) || 0) + 1);
  });

  const map = new Map<number, DestinationGroup>();

  items.forEach((item) => {
    if (!item.location || !item.location_name) return;
    const current = map.get(item.location) || {
      destinationId: item.location,
      destinationName: item.location_name,
      readyCount: 0,
      inOpenCount: 0,
      closedBoxCount: closedBoxesByDest.get(item.location) || 0,
    };
    if (item.status === 5 && !boxed.has(item.id)) {
      current.readyCount += 1;
    } else if (openBoxed.has(item.id)) {
      current.inOpenCount += 1;
    }
    map.set(item.location, current);
  });

  boxes.forEach((box) => {
    if (map.has(box.destiny)) return;
    map.set(box.destiny, {
      destinationId: box.destiny,
      destinationName: box.destination_name || `Destino ${box.destiny}`,
      readyCount: 0,
      inOpenCount: isBoxOpen(box) ? box.math_items.length : 0,
      closedBoxCount: isBoxOpen(box) ? 0 : 1,
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.destinationName.localeCompare(b.destinationName),
  );
}

export function findBoxForTrade(boxes: Box[], tradeId: number): Box | undefined {
  return boxes.find((box) => box.math_items.some((item) => item.id === tradeId));
}
