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

/** Trade status of a game already handed to its receiver. */
export const DELIVERED_STATUS = 6;
/** Trade status of a game received at the event (AMBA). */
export const RECEIVED_STATUS = 5;

export const isAlreadyDelivered = (item: { status?: number }): boolean => item.status === DELIVERED_STATUS;

/** A game that still has to arrive: not received (5) nor delivered (6). */
export const isPendingIncomingItem = (item: { status?: number }): boolean =>
  item.status !== RECEIVED_STATUS && item.status !== DELIVERED_STATUS;

export function hasPendingIncomingItems(box: Box): boolean {
  return box.math_items.some(isPendingIncomingItem);
}

export function isTransitBox(box: Box, eventLocationId = EVENT_LOCATION_ID): boolean {
  if (box.origin === eventLocationId) return false;
  if (box.destiny !== eventLocationId) return true;
  return box.math_items.some((item) => isViaAmbaItem(item, eventLocationId));
}

/** The place a copy is really sent to: its `send_to` cluster (send_as) when it
 *  has one, otherwise its own locality. */
function effectiveDestination(item: Item): { id: number; name?: string | null } | null {
  if (item.send_to != null) return { id: item.send_to, name: item.send_to_name };
  if (item.location != null) return { id: item.location, name: item.location_name };
  return null;
}

/** Distinct non-AMBA destinations (by where each game is sent, not its
 *  locality) declared on the games inside `box`, keyed by id. The label is the
 *  sending city, followed by the receivers' localities when they differ from it
 *  ("Bahía Blanca (Ingeniero White)"). */
function onwardDestinationsById(box: Box, eventLocationId: number): Map<number, string> {
  const byId = new Map<number, { city: string; localities: Set<string> }>();
  box.math_items.forEach((item) => {
    const dest = effectiveDestination(item);
    if (!dest || dest.id === eventLocationId || !dest.name) return;
    const entry = byId.get(dest.id) ?? { city: dest.name, localities: new Set<string>() };
    if (item.location_name && item.location_name !== dest.name) entry.localities.add(item.location_name);
    byId.set(dest.id, entry);
  });
  const labels = new Map<number, string>();
  byId.forEach(({ city, localities }, id) => {
    const list = Array.from(localities).sort((a, b) => a.localeCompare(b));
    labels.set(id, list.length > 0 ? `${city} (${list.join(', ')})` : city);
  });
  return labels;
}

/** Distinct non-AMBA destination labels declared on the games inside `box`
 *  (falling back to `box.destination_name` when `box.destiny` is another city). */
export function boxOnwardDestinations(box: Box, eventLocationId = EVENT_LOCATION_ID): string[] {
  const names = new Set(onwardDestinationsById(box, eventLocationId).values());
  if (names.size === 0 && box.destiny !== eventLocationId && box.destination_name) {
    names.add(box.destination_name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/** Whether `box` holds games bound for more than one onward destination. */
export function hasMixedDestinations(box: Box, eventLocationId = EVENT_LOCATION_ID): boolean {
  return onwardDestinationsById(box, eventLocationId).size > 1;
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
  if (!viaHub || name === VIA_AMBA_DESTINATION_LABEL) return name;
  return `${name} · Vía AMBA`;
}

/** Whether a box from a city to `box.destiny` travels through the event,
 *  from its games (or `extraItems` to the same destination when it's empty). */
export function boxGoesViaHub(box: Box, extraItems: Item[] = []): boolean {
  const viaMeeting = [
    ...box.math_items,
    ...extraItems.filter((item) => item.location === box.destiny),
  ].some((item) => isViaAmbaItem(item));
  return Boolean(viaMeeting) && box.origin != null && box.origin !== EVENT_LOCATION_ID;
}

/** The box destination name, marked when it travels through the event. */
export function boxDestinationLabel(box: Box, extraItems: Item[] = []): string {
  if (box.destiny === EVENT_LOCATION_ID && boxGoesViaHub(box, extraItems)) {
    return VIA_AMBA_DESTINATION_LABEL;
  }
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

/** Route param for a city's combined "Otras ciudades · Vía AMBA" lane: all
 *  `via_meeting` copies bound for other cities are packed into AMBA boxes
 *  (physical destination = EVENT_LOCATION_ID) that stay separate from the
 *  boxes holding copies whose final destination is AMBA itself. */
export const VIA_AMBA_DESTINATION_ID = -1;
export const VIA_AMBA_DESTINATION_LABEL = 'Otras ciudades · Vía AMBA';

/** The API destination_id of a box for `destinationId` (1 for both direct AMBA
 *  and the via-AMBA lane). */
export function apiDestinationId(destinationId: number, eventLocationId = EVENT_LOCATION_ID): number {
  return destinationId === VIA_AMBA_DESTINATION_ID ? eventLocationId : destinationId;
}

/** Whether a copy from a city travels through AMBA to another city. */
export function isViaAmbaItem(item: Item, eventLocationId = EVENT_LOCATION_ID): boolean {
  return Boolean(item.via_meeting) && item.location != null && item.location !== eventLocationId && item.send_to !== eventLocationId;
}

/** The destination a box belongs to for shipping, as computed by the API
 *  (`lane_destination`: a destination that ships as another is that one).
 *  Older responses without the field fall back to `destiny`. A lane equal to
 *  the box's own origin means nothing to ship, so `destiny` is kept. */
export function boxLaneDestination(box: Box): number {
  const lane = box.lane_destination;
  if (lane == null || lane === box.origin) return box.destiny;
  return lane;
}

/** The lane a city box sits in: boxes to AMBA that carry copies bound for other
 *  cities are VIA_AMBA_DESTINATION_ID (`-1`), apart from direct AMBA (`1`);
 *  any other box is its own `destiny`. */
export function boxLaneId(box: Box, eventLocationId = EVENT_LOCATION_ID): number {
  if (
    box.destiny === eventLocationId &&
    box.origin != null &&
    box.origin !== eventLocationId &&
    box.math_items.some((item) => isViaAmbaItem(item, eventLocationId))
  ) {
    return VIA_AMBA_DESTINATION_ID;
  }
  return boxLaneDestination(box);
}

/** Whether a city box to AMBA belongs to the `destinationId` lane (`1` = direct
 *  AMBA, `-1` = via AMBA). An empty open box matches the lane it was opened in,
 *  or either lane if not tagged. */
export function boxMatchesLane(box: Box, destinationId: number, eventLocationId = EVENT_LOCATION_ID): boolean {
  if (destinationId !== eventLocationId && destinationId !== VIA_AMBA_DESTINATION_ID) {
    return boxLaneDestination(box) === destinationId;
  }
  if (boxLaneDestination(box) !== eventLocationId) return false;
  if (box.math_items.length === 0) return true;
  const hasVia = box.math_items.some((item) => isViaAmbaItem(item, eventLocationId));
  return destinationId === VIA_AMBA_DESTINATION_ID ? hasVia : !hasVia;
}

/** The destination lane a copy is packed into from `origin`: from a city (not
 *  the event), `via_meeting` copies to other cities go to VIA_AMBA_DESTINATION_ID
 *  (`-1`), separate from direct AMBA (`1`); at the event they go to their final city.
 *  Localities that have a `send_as` cluster under that destination lane. */
export function packingDestinationId(
  item: Item,
  origin?: number | null,
  eventLocationId = EVENT_LOCATION_ID,
): number | undefined {
  if (!item.location) return undefined;
  if (origin != null && origin !== eventLocationId && isViaAmbaItem(item, eventLocationId)) {
    return VIA_AMBA_DESTINATION_ID;
  }
  if (item.send_to && item.send_to !== origin) {
    return item.send_to;
  }
  return item.location;
}

/** Subtitle for a copy inside a packing box: when a city box to AMBA holds a
 *  `via_meeting` copy bound for another city, prepend its final destination.
 *  When a box holds games for a clustered locality (send_as), show the locality. */
export function packingItemSubtitle(
  item: Item,
  origin?: number | null,
  eventLocationId = EVENT_LOCATION_ID,
): string | undefined {
  const receptor = receptorName(item);
  const viaHop = goesViaHub(origin, item.location, item.via_meeting, eventLocationId);
  const clusterHop = !viaHop && item.send_to && item.location && item.send_to !== item.location;
  const parts = [
    viaHop && item.location_name ? `Sigue a ${item.location_name}` : null,
    clusterHop && item.location_name ? item.location_name : null,
    receptor || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** Trade that stays inside the referrer's city: send_as cities count as the same city. */
export const isIntraLocality = (item: Item, cityId: number): boolean =>
  (item.lane_destination ?? item.location) === cityId;

export type LaneLabel = 'AMBA' | 'Vía reunión' | 'Directo';

/** The lane a copy travels in from `origin`, derived from `packingDestinationId`
 *  (the id the packing screen groups by) so the screen and the Excel cannot
 *  drift: `-1` is via the event, the hub id is AMBA, anything else is direct. */
export function laneLabel(item: Item, origin: number, eventLocationId = EVENT_LOCATION_ID): LaneLabel {
  const lane = packingDestinationId(item, origin, eventLocationId);
  if (lane === VIA_AMBA_DESTINATION_ID) return 'Vía reunión';
  if (lane === eventLocationId) return 'AMBA';
  return 'Directo';
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
    current.pendingCount += box.math_items.filter(isPendingIncomingItem).length;
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
export function isPackable(item: Pick<Item, 'status'>, requirePackableStatus = true): boolean {
  if (isAlreadyDelivered(item)) return false; // delivered games are never packed, gated or not
  return !requirePackableStatus || item.status === RECEIVED_STATUS;
}

export function groupPackingDestinations(
  items: Item[],
  boxes: Box[],
  requirePackableStatus = true,
  /** Where the boxes leave from; from a city, `via_meeting` copies to other
   *  cities group under VIA_AMBA_DESTINATION_ID (-1), apart from direct AMBA (1). */
  origin?: number,
): DestinationGroup[] {
  const boxed = boxedTradeIds(boxes);
  const openBoxed = boxedTradeIds(boxes.filter(isBoxOpen));
  const boxLaneId = (box: Box): number => {
    if (
      origin != null &&
      origin !== EVENT_LOCATION_ID &&
      box.destiny === EVENT_LOCATION_ID &&
      box.math_items.some((item) => isViaAmbaItem(item))
    ) {
      return VIA_AMBA_DESTINATION_ID;
    }
    return boxLaneDestination(box);
  };
  const closedBoxesByDest = new Map<number, number>();
  boxes.filter((box) => !isBoxOpen(box)).forEach((box) => {
    const laneId = boxLaneId(box);
    closedBoxesByDest.set(laneId, (closedBoxesByDest.get(laneId) || 0) + 1);
  });

  const map = new Map<number, DestinationGroup>();

  items.forEach((item) => {
    const destId = packingDestinationId(item, origin);
    if (!destId) return;
    const destName = destId === VIA_AMBA_DESTINATION_ID
      ? VIA_AMBA_DESTINATION_LABEL
      : (destId === item.send_to && item.send_to_name ? item.send_to_name : item.location_name);
    if (!destName) return;
    const current = map.get(destId) || {
      destinationId: destId,
      destinationName: destName,
      readyCount: 0,
      inOpenCount: 0,
      closedBoxCount: closedBoxesByDest.get(destId) || 0,
      viaHub: destId === VIA_AMBA_DESTINATION_ID,
    };
    if (destId === VIA_AMBA_DESTINATION_ID) current.viaHub = true;
    if (isPackable(item, requirePackableStatus) && !boxed.has(item.id)) {
      current.readyCount += 1;
    } else if (openBoxed.has(item.id)) {
      current.inOpenCount += 1;
    }
    map.set(destId, current);
  });

  boxes.forEach((box) => {
    const laneId = boxLaneId(box);
    const existing = map.get(laneId);
    if (existing) {
      if (laneId === VIA_AMBA_DESTINATION_ID) existing.viaHub = true;
      return;
    }
    map.set(laneId, {
      destinationId: laneId,
      destinationName:
        laneId === VIA_AMBA_DESTINATION_ID
          ? VIA_AMBA_DESTINATION_LABEL
          : box.destination_name || `Destino ${box.destiny}`,
      readyCount: 0,
      inOpenCount: isBoxOpen(box) ? box.math_items.length : 0,
      closedBoxCount: isBoxOpen(box) ? 0 : 1,
      viaHub: laneId === VIA_AMBA_DESTINATION_ID,
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.destinationName.localeCompare(b.destinationName),
  );
}

export function findBoxForTrade(boxes: Box[], tradeId: number): Box | undefined {
  return boxes.find((box) => box.math_items.some((item) => item.id === tradeId));
}

/** The label written on a box:
 *  - Boxes packed in AMBA (origin === EVENT_LOCATION_ID): `<destination city code>-<number>` (e.g. `MEN-1`),
 *    so volunteers can quickly tell boxes of different destinations apart.
 *  - Boxes packed in the interior: simple `<number>`.
 *  `destination_code` is only missing with an older backend; then the bare number is shown.
 */
export function boxLabel(box: {
  number: number | null;
  origin?: number | null;
  destination_code?: string | null;
}): string {
  if (box.number == null) return '—';
  return box.origin === EVENT_LOCATION_ID && box.destination_code
    ? `${box.destination_code}-${box.number}`
    : `${box.number}`;
}
