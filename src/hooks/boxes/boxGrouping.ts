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

/** A copy packed in a city (not at the event) for another city that travels
 *  through the event (AMBA) first: `via_meeting` on the origin-destination
 *  pair. At the event, or when the event is the destination, there is no hop. */
export function goesViaHub(
  origin: number | null | undefined,
  destinationId: number | null | undefined,
  viaMeeting: boolean | null | undefined,
  eventLocationId = EVENT_LOCATION_ID,
): boolean {
  return Boolean(viaMeeting) && origin != null && origin !== eventLocationId && destinationId !== eventLocationId;
}

/** "Catamarca · Vía AMBA" for a destination reached through the event. */
export function destinationLabel(name: string, viaHub: boolean): string {
  return viaHub ? `${name} · Vía AMBA` : name;
}

/** Whether a box from a city to `box.destiny` travels through the event,
 *  from its games (or `extraItems` to the same destination when it's empty). */
export function boxGoesViaHub(box: Box, extraItems: Item[] = []): boolean {
  const viaMeeting = [...box.math_items, ...extraItems.filter((item) => item.location === box.destiny)]
    .some((item) => item.via_meeting);
  return goesViaHub(box.origin, box.destiny, viaMeeting);
}

/** The box destination name, marked when it travels through the event. */
export function boxDestinationLabel(box: Box, extraItems: Item[] = []): string {
  return destinationLabel(box.destination_name || `Destino ${box.destiny}`, boxGoesViaHub(box, extraItems));
}

export type RouteSection<T> = {
  key: 'direct' | 'hub';
  title: string;
  entries: T[];
};

/** Splits a city's destinations by where the box physically goes: straight to
 *  another city, or to AMBA (to stay there or travel on to another city).
 *  AMBA itself leads the second section. Empty sections are dropped. */
export function splitByRoute<T>(
  entries: T[],
  destinationId: (entry: T) => number,
  viaHub: (entry: T) => boolean,
  eventLocationId = EVENT_LOCATION_ID,
): RouteSection<T>[] {
  const direct: T[] = [];
  const hub: T[] = [];
  entries.forEach((entry) => {
    if (destinationId(entry) === eventLocationId) hub.unshift(entry);
    else if (viaHub(entry)) hub.push(entry);
    else direct.push(entry);
  });
  const sections: RouteSection<T>[] = [
    { key: 'direct', title: 'Directo a otra ciudad', entries: direct },
    { key: 'hub', title: 'Van a AMBA', entries: hub },
  ];
  return sections.filter((section) => section.entries.length > 0);
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
  /** Packed from a city, the games travel through the event (AMBA). */
  viaHub: boolean;
};

/** The event scan flow marks a game packable (status 5) at the hub; boxes
 *  built in a city ignore the status, as the backend does (add_item). */
export function isPackable(item: Item, requirePackableStatus = true): boolean {
  return !requirePackableStatus || item.status === 5;
}

export function groupPackingDestinations(
  items: Item[],
  boxes: Box[],
  requirePackableStatus = true,
  /** Where the boxes leave from; marks the destinations reached via the event. */
  origin?: number,
): DestinationGroup[] {
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
      viaHub: false,
    };
    if (goesViaHub(origin, item.location, item.via_meeting)) current.viaHub = true;
    if (isPackable(item, requirePackableStatus) && !boxed.has(item.id)) {
      current.readyCount += 1;
    } else if (openBoxed.has(item.id)) {
      current.inOpenCount += 1;
    }
    map.set(item.location, current);
  });

  boxes.forEach((box) => {
    const existing = map.get(box.destiny);
    if (existing) {
      if (origin != null && boxGoesViaHub(box)) existing.viaHub = true;
      return;
    }
    map.set(box.destiny, {
      destinationId: box.destiny,
      destinationName: box.destination_name || `Destino ${box.destiny}`,
      readyCount: 0,
      inOpenCount: isBoxOpen(box) ? box.math_items.length : 0,
      closedBoxCount: isBoxOpen(box) ? 0 : 1,
      viaHub: origin != null && boxGoesViaHub(box),
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.destinationName.localeCompare(b.destinationName),
  );
}

export function findBoxForTrade(boxes: Box[], tradeId: number): Box | undefined {
  return boxes.find((box) => box.math_items.some((item) => item.id === tradeId));
}

/** The label written on a city box: `<origin_number>-<number>` (per-origin
 *  and per-destination counters), or `#<number>` without the first one. */
export function boxLabel(box: Pick<Box, 'number' | 'origin_number'>): string {
  if (box.origin_number != null && box.number != null) return `${box.origin_number}-${box.number}`;
  return `#${box.number ?? '?'}`;
}
