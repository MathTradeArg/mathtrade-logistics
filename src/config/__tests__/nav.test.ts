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
