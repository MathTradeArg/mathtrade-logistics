import { getVisibleProblems, type ProblemId, type VisibleProblem } from '../problems';

const byId = (list: VisibleProblem[]) =>
  Object.fromEntries(list.map((v) => [v.problem.id, v])) as Partial<Record<ProblemId, VisibleProblem>>;

describe('getVisibleProblems', () => {
  it('shows the box questions with a link to the Cajas role', () => {
    const v = byId(getVisibleProblems({ role: 'boxes', isAdmin: false }, 1));
    expect(v['missing-in-box']).toMatchObject({ href: '/boxes/in', needsAdmin: false });
    expect(v['not-in-list']).toMatchObject({ href: '/boxes/in/loose', needsAdmin: false });
    expect(v['interior-pending']).toMatchObject({ href: '/more/tools/amba-pending' });
  });

  it('hides the box questions from Ventanilla and sends "sin QR" to Recibir or Entregar by phase', () => {
    const phase1 = byId(getVisibleProblems({ role: 'window', isAdmin: false }, 1));
    expect(phase1['missing-in-box']).toBeUndefined();
    expect(phase1['not-in-list']).toBeUndefined();
    expect(phase1['no-qr']).toMatchObject({ href: '/receive', needsAdmin: false });

    expect(byId(getVisibleProblems({ role: 'window', isAdmin: false }, null))['no-qr']?.href).toBe('/receive');
    expect(byId(getVisibleProblems({ role: 'window', isAdmin: false }, 2))['no-qr']?.href).toBe('/deliver');
  });

  it('gives Mesas the participant, broken and still-missing questions', () => {
    const v = byId(getVisibleProblems({ role: 'tables', isAdmin: false }, 1));
    expect(v['participant-missing']).toMatchObject({ href: '/more/reports/amba-missing' });
    expect(v.broken).toMatchObject({ href: '/more/report' });
    expect(v['still-missing']).toMatchObject({ href: '/more/reports' });
    expect(v['no-qr']).toBeUndefined();
  });

  it('shows the admin-only questions to a volunteer without a link', () => {
    const v = byId(getVisibleProblems({ role: 'runner', isAdmin: false }, 1));
    expect(v['no-show']).toMatchObject({ href: null, needsAdmin: true });
    expect(v['wrong-state']).toMatchObject({ href: null, needsAdmin: true });
  });

  it('links the admin-only questions for an admin', () => {
    const v = byId(getVisibleProblems({ role: null, isAdmin: true }, 1));
    expect(v['no-show']).toMatchObject({ href: '/admin/ready-to-pickup', needsAdmin: false });
    expect(v['wrong-state']).toMatchObject({ href: '/more/tools', needsAdmin: false });
    expect(Object.keys(v)).toHaveLength(11);
  });

  it('opens /lookup in the matching mode', () => {
    const v = byId(getVisibleProblems({ role: 'runner', isAdmin: false }, 1));
    expect(v['no-label']?.href).toBe('/lookup?mode=participant');
    expect(v['where-is-game']?.href).toBe('/lookup?mode=game');
  });

  it('gives a city user without an event role nothing', () => {
    const city = { kind: 'referrer' as const, city: { id: 7, name: 'Mendoza' } };
    expect(getVisibleProblems({ role: null, isAdmin: false, city }, 1)).toEqual([]);
  });
});
