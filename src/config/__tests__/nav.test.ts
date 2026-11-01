import { getBottomNavSlots, getPageTitle, isSlotActive, shouldShowBack } from '../nav';
import type { VolunteerRole } from '@/types/volunteer';

const labels = (phase: number, role: VolunteerRole | null, isAdmin = false) =>
  getBottomNavSlots(phase, { role, isAdmin }).map((s) => s.label);

describe('getBottomNavSlots', () => {
  // design.md decision 6
  it.each([
    ['window', 1, ['Recibir', 'Más']],
    ['window', 2, ['Entregar', 'Recibir', 'Más']],
    ['boxes', 1, ['Llegan', 'Empacar', 'Más']],
    ['boxes', 2, ['Empacar', 'Más']],
    ['tables', 1, ['Mesas', 'Más']],
    ['tables', 2, ['Mesas', 'Más']],
    ['runner', 1, ['Consultar', 'Más']],
    ['runner', 2, ['Consultar', 'Más']],
  ] as const)('%s in phase %i', (role, phase, expected) => {
    expect(labels(phase, role)).toEqual(expected);
  });

  it('keeps phase 0 slots disabled for a role', () => {
    const slots = getBottomNavSlots(0, { role: 'window', isAdmin: false });
    expect(slots.map((s) => [s.label, Boolean(s.disabled)])).toEqual([['Recibir', true], ['Más', false]]);
    expect(labels(0, 'runner')).toEqual(['Consultar', 'Más']);
    expect(getBottomNavSlots(0, { role: 'runner', isAdmin: false })[0].disabled).toBeFalsy();
  });

  it('gives a volunteer without a role only Más', () => {
    for (const phase of [0, 1, 2]) expect(labels(phase, null)).toEqual(['Más']);
  });

  it('leaves the admin nav unchanged (and is the default)', () => {
    expect(labels(1, null, true)).toEqual(['Recibir', 'Llegan', 'Empacar', 'Más']);
    expect(labels(2, 'boxes', true)).toEqual(['Entregar', 'Recibir', 'Empacar', 'Más']);
    expect(getBottomNavSlots(1)).toEqual(getBottomNavSlots(1, { role: null, isAdmin: true }));
  });
});

describe('isSlotActive on /lookup', () => {
  it('marks Más when the nav has no Consultar slot', () => {
    const slots = getBottomNavSlots(1);
    const more = slots.find((s) => s.id === 'more')!;
    expect(isSlotActive('/lookup', more, 1, slots)).toBe(true);
  });

  it('marks Consultar, not Más, for a runner', () => {
    const slots = getBottomNavSlots(1, { role: 'runner', isAdmin: false });
    const more = slots.find((s) => s.id === 'more')!;
    const lookup = slots.find((s) => s.id === 'lookup')!;
    expect(isSlotActive('/lookup', lookup, 1, slots)).toBe(true);
    expect(isSlotActive('/lookup', more, 1, slots)).toBe(false);
  });
});

describe('Mi rol page chrome', () => {
  it('is titled "Mi rol" with a back button', () => {
    expect(getPageTitle('/more/role')).toBe('Mi rol');
    expect(getPageTitle('/more/reports')).toBe('Reportes');
    expect(shouldShowBack('/more/role')).toBe(true);
  });
});

describe('city nav', () => {
  const referrer = { kind: 'referrer' as const, city: { id: 7, name: 'Mendoza' } };
  const local = { kind: 'local' as const, city: { id: 7, name: 'Mendoza' } };
  const cityLabels = (phase: number | null, role: VolunteerRole | null, city: typeof referrer | typeof local) =>
    getBottomNavSlots(phase, { role, isAdmin: false, city }).map((s) => s.label);

  it.each([0, 1, 2, null])('gives a referrer Armar, Envíos, Recibidas, Más in phase %p', (phase) => {
    expect(cityLabels(phase, null, referrer)).toEqual(['Armar', 'Envíos', 'Recibidas', 'Más']);
  });

  it('titles the city volunteers, Recibidas and Usuarios screens', () => {
    expect(getPageTitle('/city/volunteers')).toBe('Voluntarios');
    expect(getPageTitle('/city/received')).toBe('Recibidas');
    expect(getPageTitle('/city/users')).toBe('Usuarios');
  });

  it('gives a local volunteer Armar, Envíos and Más', () => {
    expect(cityLabels(1, null, local)).toEqual(['Armar', 'Envíos', 'Más']);
  });

  it('keeps the role slots for a volunteer+referrer and the admin nav for admins', () => {
    expect(cityLabels(1, 'boxes', referrer)).toEqual(['Llegan', 'Empacar', 'Más']);
    expect(getBottomNavSlots(1, { role: null, isAdmin: true, city: referrer }).map((s) => s.label))
      .toEqual(['Recibir', 'Llegan', 'Empacar', 'Más']);
  });

  it('marks the city slots active on their sub-routes', () => {
    const slots = getBottomNavSlots(1, { role: null, isAdmin: false, city: referrer });
    const boxes = slots.find((s) => s.id === 'cityBoxes')!;
    const shipments = slots.find((s) => s.id === 'cityShipments')!;
    expect(isSlotActive('/city/boxes/1/30', boxes, 1, slots)).toBe(true);
    expect(isSlotActive('/city/shipments', boxes, 1, slots)).toBe(false);
    expect(isSlotActive('/city/shipments/4', shipments, 1, slots)).toBe(true);
    const received = slots.find((s) => s.id === 'cityReceived')!;
    expect(isSlotActive('/city/received', received, 1, slots)).toBe(true);
    expect(isSlotActive('/city/received', shipments, 1, slots)).toBe(false);
  });

  it('titles and back buttons for /city/*', () => {
    expect(getPageTitle('/city')).toBe('Mi ciudad');
    expect(getPageTitle('/city/boxes')).toBe('Armar cajas');
    expect(getPageTitle('/city/boxes/1/30')).toBe('Armar cajas');
    expect(getPageTitle('/city/instructivo')).toBe('Instructivo');
    expect(getPageTitle('/city/shipments/new')).toBe('Envíos');
    expect(shouldShowBack('/city')).toBe(false);
    expect(shouldShowBack('/city/boxes')).toBe(true);
  });
});
