import type { Box } from './box';

/** A city as the login and logistics/me/ payloads send it. */
export type CityRef = { id: number; name: string };

/** Who the user acts for outside the event: a referrer's city or a local
 *  volunteer's city (null: neither). */
export type CityAccess = { kind: 'referrer' | 'local'; city: CityRef } | null;

/** logistics/trackings/ row. */
export interface Tracking {
  id: number;
  tracking_code: string;
  destiny: number;
  boxes: Box[];
  price: number | null;
  weight: number | null;
  image: string | null;
  item_count: number;
}

/** api/mathtrades/ row, only what the city screens need. */
export type MathtradeRef = { id: number; name: string; active: boolean };

/** mathtrades/<id>/users/ row. Contact keys depend on who asks: the city's
 *  referrer gets all of them, an admin no phone/paid, a local volunteer
 *  only phone and telegram. */
export interface CityMember {
  id: number;
  first_name: string;
  last_name: string;
  avatar?: string | null;
  commitment?: boolean;
  trades?: number | null;
  items?: number | null;
  phone?: string | null;
  telegram?: string | null;
  email?: string | null;
  bgg_user?: string | null;
  paid?: boolean;
}
