import { EVENT_LOCATION_ID } from '@/constants/event';
import { boxContentsSummary, boxLaneDestination, boxMatchesLane, boxDestinationLabel, boxLabel, destinationLabel, goesViaHub, groupIncomingByOrigin, hasMixedDestinations, hasPendingIncomingItems, isAlreadyDelivered, isPackable, isPendingIncomingItem, boxOnwardDestinations, isTransitBox, splitByRoute, groupPackingDestinations, laneLabel, openBoxSubtitle, openBoxTitle, packerName, packingDestinationId, packingItemSubtitle, VIA_AMBA_DESTINATION_ID, VIA_AMBA_DESTINATION_LABEL } from '@/hooks/boxes/boxGrouping';
import type { Box, Item } from '@/types';

const box = (overrides: Partial<Box> & Pick<Box, 'id' | 'origin' | 'origin_name'>): Box => ({
  number: 3,
  destiny: EVENT_LOCATION_ID,
  destination_name: 'AMBA',
  closed_at: '2026-09-01T00:00:00Z',
  math_items: [{ id: overrides.id, title: 'Game', assigned_trade_code: overrides.id, status: 4 }],
  created_by_username: null,
  created_by_first_name: null,
  created_by_last_name: null,
  ...overrides,
});

describe('boxGrouping', () => {
  it('keeps Córdoba #3 and Rosario #3 as separate origins', () => {
    const groups = groupIncomingByOrigin([
      box({ id: 1, origin: 8, origin_name: 'Córdoba' }),
      box({ id: 2, origin: 9, origin_name: 'Rosario' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.originName).sort()).toEqual(['Córdoba', 'Rosario']);
    expect(groups.every((group) => group.boxCount === 1)).toBe(true);
  });

  it('counts ready vs boxed items per destination', () => {
    const items: Item[] = [
      { id: 1, title: 'A', assigned_trade_code: 1, status: 5, location: 8, location_name: 'Córdoba' },
      { id: 2, title: 'B', assigned_trade_code: 2, status: 5, location: 8, location_name: 'Córdoba' },
    ];
    const boxes: Box[] = [
      box({
        id: 10,
        origin: EVENT_LOCATION_ID,
        origin_name: 'AMBA',
        destiny: 8,
        destination_name: 'Córdoba',
        closed_at: null,
        number: null,
        math_items: [items[1]],
      }),
    ];

    const [cordoba] = groupPackingDestinations(items, boxes);
    expect(cordoba.readyCount).toBe(1);
    expect(cordoba.inOpenCount).toBe(1);
    expect(cordoba.closedBoxCount).toBe(0);
  });

  it('packs city via_meeting items into a separate via-AMBA lane from direct AMBA', () => {
    const CORDOBA = 8;
    const CATAMARCA = 12;
    const MENDOZA = 7;
    const ROSARIO = 9;
    const items: Item[] = [
      { id: 1, title: 'A', assigned_trade_code: 1, status: 2, location: CATAMARCA, location_name: 'Catamarca', via_meeting: true, receptor_first_name: 'Ana', receptor_last_name: 'Paz' },
      { id: 4, title: 'D', assigned_trade_code: 4, status: 2, location: MENDOZA, location_name: 'Mendoza', via_meeting: true, receptor_first_name: 'Dani', receptor_last_name: 'Sol' },
      { id: 2, title: 'B', assigned_trade_code: 2, status: 2, location: ROSARIO, location_name: 'Rosario', via_meeting: false, receptor_first_name: 'Beto', receptor_last_name: 'Ríos' },
      { id: 3, title: 'C', assigned_trade_code: 3, status: 2, location: EVENT_LOCATION_ID, location_name: 'AMBA', via_meeting: true, receptor_first_name: 'Ciro', receptor_last_name: 'Luz' },
    ];

    // From a city, Catamarca and Mendoza (via_meeting) share the VIA_AMBA lane (-1),
    // separate from direct AMBA (1) and direct Rosario (9).
    const groups = groupPackingDestinations(items, [], false, CORDOBA);
    expect(groups.map((g) => [g.destinationId, g.destinationName, g.readyCount, g.viaHub])).toEqual([
      [EVENT_LOCATION_ID, 'AMBA', 1, false],
      [VIA_AMBA_DESTINATION_ID, VIA_AMBA_DESTINATION_LABEL, 2, true],
      [ROSARIO, 'Rosario', 1, false],
    ]);
    expect(packingDestinationId(items[0], CORDOBA)).toBe(VIA_AMBA_DESTINATION_ID);
    expect(packingDestinationId(items[1], CORDOBA)).toBe(VIA_AMBA_DESTINATION_ID);
    expect(packingDestinationId(items[2], CORDOBA)).toBe(ROSARIO);
    expect(packingDestinationId(items[3], CORDOBA)).toBe(EVENT_LOCATION_ID);
    expect(packingItemSubtitle(items[0], CORDOBA)).toBe('Sigue a Catamarca · Ana Paz');
    expect(packingItemSubtitle(items[2], CORDOBA)).toBe('Beto Ríos');
    expect(packingItemSubtitle(items[3], CORDOBA)).toBe('Ciro Luz');

    // At the event, the hop is done: Catamarca is packed under its own destination.
    expect(goesViaHub(EVENT_LOCATION_ID, CATAMARCA, true)).toBe(false);
    expect(packingDestinationId(items[0], EVENT_LOCATION_ID)).toBe(CATAMARCA);
    expect(packingItemSubtitle(items[0], EVENT_LOCATION_ID)).toBe('Ana Paz');
    const eventGroups = groupPackingDestinations(items, [], false, EVENT_LOCATION_ID);
    expect(eventGroups.map((g) => g.destinationId)).toContain(CATAMARCA);

    expect(destinationLabel('Catamarca', true)).toBe('Catamarca · Vía AMBA');
    expect(destinationLabel(VIA_AMBA_DESTINATION_LABEL, true)).toBe(VIA_AMBA_DESTINATION_LABEL);
    expect(destinationLabel('Rosario', false)).toBe('Rosario');
    const closedViaAmbaBox = box({
      id: 20, origin: CORDOBA, origin_name: 'Córdoba', destiny: EVENT_LOCATION_ID, destination_name: 'AMBA',
      math_items: [items[0]],
    });
    expect(boxDestinationLabel(closedViaAmbaBox)).toBe(VIA_AMBA_DESTINATION_LABEL);
  });

  it('splits direct destinations from the ones that go to AMBA, AMBA first', () => {
    const dests = [
      { id: 12, name: 'Catamarca', via: true },
      { id: 9, name: 'Rosario', via: false },
      { id: EVENT_LOCATION_ID, name: 'AMBA', via: true },
    ];
    const sections = splitByRoute(dests, (d) => d.id, (d) => d.via);
    expect(sections.map((s) => [s.title, s.entries.map((d) => d.name)])).toEqual([
      ['Directo a otra ciudad', ['Rosario']],
      ['Van a AMBA', ['AMBA', 'Catamarca']],
    ]);
    expect(splitByRoute([dests[1]], (d) => d.id, (d) => d.via).map((s) => s.key)).toEqual(['direct']);
  });

  it('summarizes open packing boxes by contents and who opened them', () => {
    const open = box({
      id: 10,
      origin: EVENT_LOCATION_ID,
      origin_name: 'AMBA',
      destiny: 8,
      destination_name: 'Córdoba',
      closed_at: null,
      number: null,
      created_by_first_name: 'Ana',
      created_by_last_name: 'Palermo',
      math_items: [
        { id: 1, title: 'Catan', assigned_trade_code: 1, status: 5 },
        { id: 2, title: 'Azul', assigned_trade_code: 2, status: 5 },
        { id: 3, title: 'Root', assigned_trade_code: 3, status: 5 },
        { id: 4, title: 'Earth', assigned_trade_code: 4, status: 5 },
      ],
    });

    expect(packerName(open)).toBe('Ana Palermo');
    expect(openBoxTitle(open)).toBe('Caja de Ana Palermo');
    expect(boxContentsSummary(open)).toBe('Catan, Azul, Root y 1 más');
    expect(openBoxSubtitle(open)).toBe('Catan, Azul, Root y 1 más · la abrió Ana Palermo');
    expect(boxContentsSummary({ ...open, math_items: [] })).toBe('Vacía');
  });

  it('labels AMBA boxes <destination code>-<number> and interior boxes with the bare number', () => {
    // Box leaving the hub: destination code + number (origin_number is not used)
    const ambaBox = { origin: EVENT_LOCATION_ID, destination_code: 'MEN', origin_number: 3, number: 1 };
    expect(boxLabel(ambaBox)).toBe('MEN-1');

    // Interior box: simple number
    const interiorBox = { origin: 7, destination_code: 'COR', origin_number: 1, number: 2 };
    expect(boxLabel(interiorBox)).toBe('2');

    // Box without number
    expect(boxLabel({ origin: EVENT_LOCATION_ID, destination_code: 'MEN', number: null })).toBe('—');

    // Older backend without destination_code
    expect(boxLabel({ origin: EVENT_LOCATION_ID, number: 1 })).toBe('1');
  });

  describe('onward destinations of a box', () => {
    const item = (id: number, extra: Partial<Item>): Item => ({ id, title: `G${id}`, status: 4, ...extra } as Item);
    const laPlata = item(1, { location: 20, location_name: 'La Plata', send_to: EVENT_LOCATION_ID, send_to_name: 'AMBA', via_meeting: true });
    const quilmes = item(2, { location: 21, location_name: 'Quilmes', send_to: EVENT_LOCATION_ID, send_to_name: 'AMBA', via_meeting: true });
    const caba = item(3, { location: EVENT_LOCATION_ID, location_name: 'AMBA' });
    const mendoza = item(4, { location: 9, location_name: 'Mendoza', via_meeting: true });
    const cba = box({ id: 1, origin: 5, origin_name: 'Córdoba', destiny: EVENT_LOCATION_ID, closed_at: null });

    it('does not report mixed when several localities are sent as AMBA', () => {
      const b = { ...cba, math_items: [laPlata, quilmes, caba] };
      expect(hasMixedDestinations(b)).toBe(false);
      expect(boxOnwardDestinations(b)).toEqual([]);
      expect(isTransitBox(b)).toBe(false);
    });

    it('reports only the real onward destination next to send_as AMBA games', () => {
      const b = { ...cba, math_items: [laPlata, mendoza] };
      expect(hasMixedDestinations(b)).toBe(false);
      expect(boxOnwardDestinations(b)).toEqual(['Mendoza']);
      expect(isTransitBox(b)).toBe(true);
    });

    it('does not report mixed for localities sent as the same city', () => {
      const a = item(5, { location: 30, location_name: 'Villa Carlos Paz', send_to: 7, send_to_name: 'Córdoba' });
      const c = item(6, { location: 31, location_name: 'Río Ceballos', send_to: 7, send_to_name: 'Córdoba' });
      const b = box({ id: 2, origin: EVENT_LOCATION_ID, origin_name: 'AMBA', destiny: 7, destination_name: 'Córdoba', math_items: [a, c] });
      expect(hasMixedDestinations(b)).toBe(false);
      expect(boxOnwardDestinations(b)).toEqual(['Córdoba (Río Ceballos, Villa Carlos Paz)']);
    });

    it('shows the sending city with the receiver locality when they differ', () => {
      const white = item(8, { location: 40, location_name: 'Ingeniero White', send_to: 12, send_to_name: 'Bahía Blanca' });
      const bb = item(9, { location: 12, location_name: 'Bahía Blanca', send_to: 12, send_to_name: 'Bahía Blanca' });
      expect(boxOnwardDestinations({ ...cba, math_items: [white] })).toEqual(['Bahía Blanca (Ingeniero White)']);
      expect(boxOnwardDestinations({ ...cba, math_items: [white, bb] })).toEqual(['Bahía Blanca (Ingeniero White)']);
      expect(boxOnwardDestinations({ ...cba, math_items: [bb] })).toEqual(['Bahía Blanca']);
    });

    it('still reports mixed for different real destinations', () => {
      const salta = item(7, { location: 11, location_name: 'Salta', via_meeting: true });
      expect(hasMixedDestinations({ ...cba, math_items: [mendoza, salta] })).toBe(true);
    });
  });

  describe('lane_destination from the API', () => {
    const hub = EVENT_LOCATION_ID;
    it('falls back to destiny for old responses without the field', () => {
      expect(boxLaneDestination(box({ id: 1, origin: hub, origin_name: 'AMBA', destiny: 7 }))).toBe(7);
    });

    it('uses lane_destination when present', () => {
      expect(boxLaneDestination(box({ id: 1, origin: hub, origin_name: 'AMBA', destiny: 8, lane_destination: 7 }))).toBe(7);
    });

    it('keeps destiny when the lane is the box origin itself', () => {
      expect(boxLaneDestination(box({ id: 1, origin: hub, origin_name: 'AMBA', destiny: 20, lane_destination: hub }))).toBe(20);
    });

    it('matches a box that ships as the lane city, not another lane', () => {
      const cordoba = box({ id: 1, origin: hub, origin_name: 'AMBA', destiny: 8, lane_destination: 7, math_items: [] });
      const salta = box({ id: 2, origin: hub, origin_name: 'AMBA', destiny: 11, lane_destination: 11, math_items: [] });
      expect(boxMatchesLane(cordoba, 7)).toBe(true);
      expect(boxMatchesLane(salta, 7)).toBe(false);
    });

    it('counts closed hub boxes under their lane', () => {
      const closed = box({ id: 1, origin: hub, origin_name: 'AMBA', destiny: 8, lane_destination: 7 });
      const item = { id: 5, title: 'G', assigned_trade_code: 5, status: 4, location: 8, send_to: 7 } as Item;
      const groups = groupPackingDestinations([item], [closed], true, hub);
      expect(groups.find((g) => g.destinationId === 7)?.closedBoxCount).toBe(1);
    });
  });

  describe('laneLabel agrees with the packing screen grouping', () => {
    const MENDOZA = 7;
    const fixtures: Array<[string, Item, string]> = [
      ['AMBA', { id: 1, title: 'a', assigned_trade_code: 1, status: 2, location: EVENT_LOCATION_ID, location_name: 'AMBA' }, 'AMBA'],
      ['AMBA with via_meeting', { id: 2, title: 'b', assigned_trade_code: 2, status: 2, location: EVENT_LOCATION_ID, location_name: 'AMBA', via_meeting: true }, 'AMBA'],
      ['attendee shipped to AMBA', { id: 3, title: 'c', assigned_trade_code: 3, status: 2, location: 9, location_name: 'Rosario', send_to: EVENT_LOCATION_ID, via_meeting: true }, 'AMBA'],
      ['via_meeting', { id: 4, title: 'd', assigned_trade_code: 4, status: 2, location: 15, location_name: 'Salta', via_meeting: true }, 'Vía reunión'],
      ['direct', { id: 5, title: 'e', assigned_trade_code: 5, status: 2, location: 9, location_name: 'Rosario', via_meeting: false }, 'Directo'],
      ['send_as cluster', { id: 6, title: 'f', assigned_trade_code: 6, status: 2, location: 12, location_name: 'Esperanza', send_to: 13, send_to_name: 'Santa Fe', via_meeting: false }, 'Directo'],
    ];

    it.each(fixtures)('%s', (_name, item, expected) => {
      expect(laneLabel(item, MENDOZA)).toBe(expected);
      const [group] = groupPackingDestinations([item], [], false, MENDOZA);
      const fromScreen = group.destinationId === VIA_AMBA_DESTINATION_ID
        ? 'Vía reunión'
        : group.destinationId === EVENT_LOCATION_ID ? 'AMBA' : 'Directo';
      expect(fromScreen).toBe(laneLabel(item, MENDOZA));
    });
  });

  describe('delivered games (status 6)', () => {
    const it6 = { status: 6 } as Item;
    const it5 = { status: 5 } as Item;
    const it1 = { status: 1 } as Item;

    it('isPackable always rejects status 6, even without phase gating', () => {
      expect(isPackable(it6, false)).toBe(false);
      expect(isPackable(it6, true)).toBe(false);
      expect(isPackable(it1, false)).toBe(true);
      expect(isPackable(it5, true)).toBe(true);
      expect(isPackable(it1, true)).toBe(false);
      expect(isAlreadyDelivered(it6)).toBe(true);
      expect(isAlreadyDelivered(it5)).toBe(false);
    });

    it('treats 5 and 6 as not pending incoming', () => {
      expect(isPendingIncomingItem(it5)).toBe(false);
      expect(isPendingIncomingItem(it6)).toBe(false);
      expect(isPendingIncomingItem(it1)).toBe(true);
      const box = { math_items: [it5, it6] } as unknown as Box;
      expect(hasPendingIncomingItems(box)).toBe(false);
      expect(hasPendingIncomingItems({ math_items: [it5, it1] } as unknown as Box)).toBe(true);
    });
  });
});
