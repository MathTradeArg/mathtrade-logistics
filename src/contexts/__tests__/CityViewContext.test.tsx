import { cityViewRules } from '@/contexts/CityViewContext';

const own = { kind: 'referrer' as const, city: { id: 7, name: 'Mendoza' } };
const locations = [{ id: 7, name: 'Mendoza' }, { id: 9, name: 'Salta' }];
const base = { asLocation: null, mathtradeId: null, activeMathtradeId: 8, locations };

describe('cityViewRules', () => {
  it('gives a non-admin their own city, no params and writes', () => {
    expect(cityViewRules({ ...base, isAdmin: false, cityAccess: own })).toEqual({
      kind: 'referrer', cityId: 7, cityName: 'Mendoza', params: {}, readOnly: false,
    });
    const local = { kind: 'local' as const, city: own.city };
    expect(cityViewRules({ ...base, isAdmin: false, cityAccess: local }).kind).toBe('local');
  });

  it('ignores an admin pick for a non-admin', () => {
    const view = cityViewRules({ ...base, isAdmin: false, cityAccess: own, asLocation: 9, mathtradeId: 3 });
    expect(view.cityId).toBe(7);
    expect(view.params).toEqual({});
    expect(view.readOnly).toBe(false);
  });

  it('shows an admin without a city nothing until they pick one', () => {
    const view = cityViewRules({ ...base, isAdmin: true, cityAccess: null });
    expect(view.cityId).toBeNull();
    expect(view.kind).toBeNull();
    expect(view.readOnly).toBe(false);
  });

  it('adds as_location only for another city and makes the view read-only', () => {
    const other = cityViewRules({ ...base, isAdmin: true, cityAccess: null, asLocation: 9 });
    expect(other).toMatchObject({ cityId: 9, cityName: 'Salta', kind: 'referrer', params: { as_location: 9 }, readOnly: true });
    const same = cityViewRules({ ...base, isAdmin: true, cityAccess: own, asLocation: 7 });
    expect(same.params).toEqual({});
    expect(same.readOnly).toBe(false);
  });

  it('adds mathtrade only when it differs from the active edition', () => {
    const past = cityViewRules({ ...base, isAdmin: true, cityAccess: own, mathtradeId: 3 });
    expect(past.params).toEqual({ mathtrade: 3 });
    expect(past.readOnly).toBe(true);
    const active = cityViewRules({ ...base, isAdmin: true, cityAccess: own, mathtradeId: 8 });
    expect(active.params).toEqual({});
    expect(active.readOnly).toBe(false);
  });
});
