import { buildReferrerDirectory, type DirectoryRow, type ReferrerContact } from '../referrers';

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
