import { EVENT_LOCATION_ID } from '@/constants/event';

// Personal data (DNI, phone) lives in the database and comes from
// GET logistics/directory/; never commit it here.

export type ReferrerContact = {
  name: string;
  dni: string;
  telegram: string;
  phone: string;
  username?: string;
};

export type LocationReferrerInfo = {
  locationId: number;
  city: string;
  code: string;
  address: string;
  payOnDelivery?: boolean;
  referrers: ReferrerContact[];
};

export type DirectoryRow = {
  location_id: number;
  city: string;
  code: string;
  address: string;
  pay_on_delivery: boolean;
  referrers: ReferrerContact[];
};

/** The hub is always labelled CABA, whatever its Location is called. */
export const AMBA_FALLBACK_INFO: LocationReferrerInfo = {
  locationId: EVENT_LOCATION_ID,
  city: 'CABA',
  code: 'CABA',
  address: '',
  payOnDelivery: true,
  referrers: [],
};

export type ReferrerDirectory = {
  amba: LocationReferrerInfo;
  interior: LocationReferrerInfo[];
};

export function buildReferrerDirectory(rows: DirectoryRow[]): ReferrerDirectory {
  const infos: LocationReferrerInfo[] = rows.map((row) => ({
    locationId: row.location_id,
    city: row.city,
    code: row.code,
    address: row.address || '',
    payOnDelivery: row.pay_on_delivery,
    referrers: row.referrers || [],
  }));
  const hub = infos.find((info) => info.locationId === EVENT_LOCATION_ID);
  const amba: LocationReferrerInfo = hub
    ? { ...hub, city: 'CABA', code: 'CABA', payOnDelivery: true }
    : AMBA_FALLBACK_INFO;
  const interior = infos
    .filter((info) => info.locationId !== EVENT_LOCATION_ID)
    .sort((a, b) => a.city.localeCompare(b.city, 'es'));
  return { amba, interior };
}
