import {
  buildReferrerDirectory,
  defaultSenderFor,
  type DirectoryRow,
  type ReferrerContact,
} from '../referrers';

describe('referrer directory contacts', () => {
  it('a contact carries only what a box label prints (no username)', () => {
    const contact: ReferrerContact = { name: 'Beto', dni: '1', telegram: '@beto', phone: '2' };
    // The API no longer sends username; the type must not offer it (checked by tsc).
    // @ts-expect-error username is not part of a referrer contact
    const withUsername: ReferrerContact = { ...contact, username: 'beto' };
    expect(Object.keys(contact).sort()).toEqual(['dni', 'name', 'phone', 'telegram']);
    expect(withUsername.name).toBe('Beto');
  });

  it('builds the directory from rows without username', () => {
    const rows: DirectoryRow[] = [{
      location_id: 34, city: 'Ciudad Prueba', code: 'CPR', address: 'Calle 1',
      pay_on_delivery: false,
      referrers: [{ name: 'Beto', dni: '1', telegram: '@beto', phone: '2' }],
    }];
    const { interior } = buildReferrerDirectory(rows);
    expect(interior[0].referrers[0]).toEqual({ name: 'Beto', dni: '1', telegram: '@beto', phone: '2' });
  });
});

describe('defaultSenderFor', () => {
  // Fictitious data: the real directory lives in the database.
  const directory = buildReferrerDirectory([
    {
      location_id: 1, city: 'AMBA', code: 'AMBA', address: '', pay_on_delivery: true,
      referrers: [{ name: 'Ana Hub', dni: '1', telegram: '', phone: '2' }],
    },
    {
      location_id: 34, city: 'Ciudad Prueba', code: 'CPR', address: '', pay_on_delivery: false,
      referrers: [{ name: 'Beto', dni: '3', telegram: '', phone: '4' }],
    },
  ]);

  it('returns the hub (labelled CABA) for location 1', () => {
    const info = defaultSenderFor(directory, 1);
    expect(info?.city).toBe('CABA');
    expect(info?.referrers[0].name).toBe('Ana Hub');
  });

  it('returns that city for an interior location', () => {
    const info = defaultSenderFor(directory, 34);
    expect(info?.city).toBe('Ciudad Prueba');
    expect(info?.referrers[0].name).toBe('Beto');
  });

  it('returns undefined without a city or for an unknown id', () => {
    expect(defaultSenderFor(directory, undefined)).toBeUndefined();
    expect(defaultSenderFor(directory, 999)).toBeUndefined();
  });
});
