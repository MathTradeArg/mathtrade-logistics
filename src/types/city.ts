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
