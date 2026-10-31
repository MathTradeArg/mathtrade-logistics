import { EVENT_LOCATION_ID } from '@/constants/event';
import { boxContentsSummary, boxDestinationLabel, destinationLabel, goesViaHub, groupIncomingByOrigin, splitByRoute, groupPackingDestinations, openBoxSubtitle, openBoxTitle, packerName } from '@/hooks/boxes/boxGrouping';
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

  it('marks a city destination reached through the event as "Vía AMBA"', () => {
    const CORDOBA = 8;
    const CATAMARCA = 12;
    const ROSARIO = 9;
    const items: Item[] = [
      { id: 1, title: 'A', assigned_trade_code: 1, status: 2, location: CATAMARCA, location_name: 'Catamarca', via_meeting: true },
      { id: 2, title: 'B', assigned_trade_code: 2, status: 2, location: ROSARIO, location_name: 'Rosario', via_meeting: false },
      { id: 3, title: 'C', assigned_trade_code: 3, status: 2, location: EVENT_LOCATION_ID, location_name: 'AMBA', via_meeting: true },
    ];

    const groups = groupPackingDestinations(items, [], false, CORDOBA);
    const label = (id: number) => {
      const group = groups.find((g) => g.destinationId === id)!;
      return destinationLabel(group.destinationName, group.viaHub);
    };
    expect(label(CATAMARCA)).toBe('Catamarca · Vía AMBA');
    expect(label(ROSARIO)).toBe('Rosario');
    expect(label(EVENT_LOCATION_ID)).toBe('AMBA');

    // At the event the hop is already done.
    expect(goesViaHub(EVENT_LOCATION_ID, CATAMARCA, true)).toBe(false);
    expect(groupPackingDestinations(items, [], false, EVENT_LOCATION_ID).some((g) => g.viaHub)).toBe(false);
    expect(groupPackingDestinations(items, [], false).some((g) => g.viaHub)).toBe(false);

    const closed = box({
      id: 20, origin: CORDOBA, origin_name: 'Córdoba', destiny: CATAMARCA, destination_name: 'Catamarca',
      math_items: [items[0]],
    });
    expect(boxDestinationLabel(closed)).toBe('Catamarca · Vía AMBA');
    // An empty box takes the mark from the games still to pack.
    expect(boxDestinationLabel({ ...closed, math_items: [] })).toBe('Catamarca');
    expect(boxDestinationLabel({ ...closed, math_items: [] }, items)).toBe('Catamarca · Vía AMBA');
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
