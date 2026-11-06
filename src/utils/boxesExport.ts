import {
  VIA_AMBA_DESTINATION_ID,
  VIA_AMBA_DESTINATION_LABEL,
  destinationLabel,
  goesViaHub,
  isIntraLocality,
  laneLabel,
  packingDestinationId,
  splitByRoute,
} from '@/hooks/boxes/boxGrouping';
import type { Item } from '@/types';
import { formatTradeCode, giverName } from '@/utils/tradeCode';
import type { Cell, WorkbookSheet } from '@/utils/xlsx';

const HEADERS = ['Código', 'Juego', 'Entregador', 'Destino', 'Carril'];

const gameRow = (item: Item, origin: number): Cell[] => [
  formatTradeCode(item.assigned_trade_code),
  item.title,
  giverName(item),
  destinationLabel(item.location_name ?? '', goesViaHub(origin, item.location, item.via_meeting)),
  laneLabel(item, origin),
];

const byCode = (a: Item, b: Item) =>
  Number(a.assigned_trade_code) - Number(b.assigned_trade_code) || a.id - b.id;

type Group = { destinationId: number; name: string; viaHub: boolean; items: Item[] };

const groupName = (item: Item, destinationId: number): string => {
  if (destinationId === VIA_AMBA_DESTINATION_ID) return VIA_AMBA_DESTINATION_LABEL;
  if (destinationId === item.send_to && item.send_to_name) return item.send_to_name;
  return item.location_name ?? `Destino ${destinationId}`;
};

const countLabel = (count: number) => `${count} ${count === 1 ? 'juego' : 'juegos'}`;

/** The referrer's boxes workbook: "Por destino" (games grouped as the packing
 *  screen groups them) and "Total" (all of them by label). Games that stay in
 *  `origin`'s city (send_as cities included) are left out. */
export function buildBoxesExport(items: Item[], origin: number): WorkbookSheet[] {
  const outgoing = items.filter((item) => !isIntraLocality(item, origin)).sort(byCode);

  const groups = new Map<number, Group>();
  outgoing.forEach((item) => {
    const destinationId = packingDestinationId(item, origin);
    if (destinationId === undefined) return;
    const group = groups.get(destinationId) ?? {
      destinationId,
      name: groupName(item, destinationId),
      viaHub: destinationId === VIA_AMBA_DESTINATION_ID,
      items: [],
    };
    group.items.push(item);
    groups.set(destinationId, group);
  });
  const ordered = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  const sections = splitByRoute(ordered, (group) => group.destinationId, (group) => group.viaHub);

  const aoa: Cell[][] = [HEADERS];
  sections.forEach((section) => section.entries.forEach((group) => {
    aoa.push([`${group.name} · ${countLabel(group.items.length)}`]);
    group.items.forEach((item) => aoa.push(gameRow(item, origin)));
    aoa.push([]);
  }));

  const total = outgoing.map((item) => {
    const row = gameRow(item, origin);
    return Object.fromEntries(HEADERS.map((header, index) => [header, row[index]]));
  });

  return [
    { name: 'Por destino', aoa },
    { name: 'Total', rows: total },
  ];
}
