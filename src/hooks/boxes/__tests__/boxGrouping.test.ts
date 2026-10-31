import { EVENT_LOCATION_ID } from '@/constants/event';
import { boxContentsSummary, boxDestinationLabel, destinationLabel, goesViaHub, groupIncomingByOrigin, splitByRoute, groupPackingDestinations, openBoxSubtitle, openBoxTitle, packerName, packingDestinationId, packingItemSubtitle, VIA_AMBA_DESTINATION_ID, VIA_AMBA_DESTINATION_LABEL } from '@/hooks/boxes/boxGrouping';
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
});
