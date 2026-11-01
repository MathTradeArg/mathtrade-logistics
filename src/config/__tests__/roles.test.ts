import { homeFor, isPathAllowed, roleHome } from '../roles';

describe('isPathAllowed', () => {
  it('lets only window into /receive', () => {
    expect(isPathAllowed('/receive', 'window', false)).toBe(true);
    expect(isPathAllowed('/receive', 'boxes', false)).toBe(false);
    expect(isPathAllowed('/receive', 'runner', false)).toBe(false);
    expect(isPathAllowed('/receive-games', 'window', false)).toBe(true);
    expect(isPathAllowed('/deliver-to-user', 'window', false)).toBe(true);
  });

  it('lets only boxes into /boxes/out/3', () => {
    expect(isPathAllowed('/boxes/out/3', 'boxes', false)).toBe(true);
    expect(isPathAllowed('/boxes/out/3', 'window', false)).toBe(false);
    expect(isPathAllowed('/boxes/out/3', 'runner', false)).toBe(false);
  });

  it('opens /more/tools, /lookup and / to every role', () => {
    for (const role of ['window', 'boxes', 'runner'] as const) {
      expect(isPathAllowed('/more/tools', role, false)).toBe(true);
      expect(isPathAllowed('/lookup', role, false)).toBe(true);
      expect(isPathAllowed('/', role, false)).toBe(true);
    }
  });

  it('keeps /admin/volunteers for admins', () => {
    for (const role of ['window', 'boxes', 'runner'] as const) {
      expect(isPathAllowed('/admin/volunteers', role, false)).toBe(false);
    }
    expect(isPathAllowed('/admin/volunteers', null, true)).toBe(true);
    expect(isPathAllowed('/receive', null, true)).toBe(true);
  });

  it('allows only the always-open paths without a role', () => {
    expect(isPathAllowed('/more', null, false)).toBe(true);
    expect(isPathAllowed('/select-role', null, false)).toBe(true);
    expect(isPathAllowed('/reports', null, false)).toBe(true);
    expect(isPathAllowed('/', null, false)).toBe(true);
    expect(isPathAllowed('/receive', null, false)).toBe(false);
    expect(isPathAllowed('/boxes', null, false)).toBe(false);
  });

  it('matches whole segments only', () => {
    expect(isPathAllowed('/boxesx', 'boxes', false)).toBe(false);
    expect(isPathAllowed('/morex', 'runner', false)).toBe(false);
  });
});

describe('roleHome', () => {
  it.each([
    ['window', 0, '/'],
    ['window', 1, '/receive'],
    ['window', 2, '/deliver'],
    ['boxes', 0, '/'],
    ['boxes', 1, '/boxes/in'],
    ['boxes', 2, '/boxes/out'],
    ['tables', 0, '/tables'],
    ['tables', 1, '/tables'],
    ['tables', 2, '/tables'],
    ['runner', 0, '/lookup'],
    ['runner', 1, '/lookup'],
    ['runner', 2, '/lookup'],
  ] as const)('%s in phase %i → %s', (role, phase, home) => {
    expect(roleHome(role, phase)).toBe(home);
  });

  it('goes to / while the phase is unknown', () => {
    expect(roleHome('window', null)).toBe('/');
  });
});

describe('city users', () => {
  const referrer = { kind: 'referrer' as const, city: { id: 7, name: 'Mendoza' } };

  it('lets a pure referrer visit /city/** and /more', () => {
    expect(isPathAllowed('/city', null, false, referrer)).toBe(true);
    expect(isPathAllowed('/city/boxes/1/30', null, false, referrer)).toBe(true);
    expect(isPathAllowed('/city/shipments/new', null, false, referrer)).toBe(true);
    expect(isPathAllowed('/more', null, false, referrer)).toBe(true);
    expect(isPathAllowed('/', null, false, referrer)).toBe(true);
  });

  it('keeps a pure referrer off the event screens', () => {
    expect(isPathAllowed('/boxes/out', null, false, referrer)).toBe(false);
    expect(isPathAllowed('/lookup', null, false, referrer)).toBe(false);
    expect(isPathAllowed('/select-role', null, false, referrer)).toBe(false);
    expect(isPathAllowed('/cityx', null, false, referrer)).toBe(false);
  });

  it('gives a volunteer+referrer their role paths plus /city', () => {
    expect(isPathAllowed('/boxes/out', 'boxes', false, referrer)).toBe(true);
    expect(isPathAllowed('/lookup', 'boxes', false, referrer)).toBe(true);
    expect(isPathAllowed('/city/boxes', 'boxes', false, referrer)).toBe(true);
    expect(isPathAllowed('/receive', 'boxes', false, referrer)).toBe(false);
  });

  it('lets a pure referrer manage their volunteers', () => {
    expect(isPathAllowed('/city/volunteers', null, false, referrer)).toBe(true);
  });

  it('lets a referrer visit Recibidas and Usuarios', () => {
    expect(isPathAllowed('/city/received', null, false, referrer)).toBe(true);
    expect(isPathAllowed('/city/users', null, false, referrer)).toBe(true);
  });

  it('gives a local volunteer boxes, Instructivo, Usuarios and the Ejemplares list under /city', () => {
    const local = { kind: 'local' as const, city: { id: 7, name: 'Mendoza' } };
    expect(isPathAllowed('/city', null, false, local)).toBe(true);
    expect(isPathAllowed('/city/boxes', null, false, local)).toBe(true);
    expect(isPathAllowed('/city/boxes/1/30', null, false, local)).toBe(true);
    expect(isPathAllowed('/city/instructivo', null, false, local)).toBe(true);
    expect(isPathAllowed('/more', null, false, local)).toBe(true);
    expect(isPathAllowed('/city/shipments', null, false, local)).toBe(true);
    expect(isPathAllowed('/city/users', null, false, local)).toBe(true);
    expect(isPathAllowed('/city/received', null, false, local)).toBe(false);
    expect(isPathAllowed('/city/shipments/4', null, false, local)).toBe(false);
    expect(isPathAllowed('/city/shipments/new', null, false, local)).toBe(false);
    expect(isPathAllowed('/city/volunteers', null, false, local)).toBe(false);
    expect(isPathAllowed('/boxes/out', null, false, local)).toBe(false);
  });

  it('keeps /city closed to users without a city', () => {
    expect(isPathAllowed('/city', 'boxes', false)).toBe(false);
  });

  it('homeFor sends a pure city user to /city, others to their role home', () => {
    expect(homeFor(null, 1, referrer)).toBe('/city');
    expect(homeFor(null, null, { kind: 'local', city: { id: 7, name: 'Mendoza' } })).toBe('/city');
    expect(homeFor('boxes', 2, referrer)).toBe('/boxes/out');
    expect(homeFor(null, 1, null)).toBe('/');
  });
});
