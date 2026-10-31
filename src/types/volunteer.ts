import type { CityRef } from './city';

export type VolunteerRole = 'window' | 'boxes' | 'runner';

export interface VolunteerUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/** Who added a local volunteer: a referrer. */
export interface VolunteerAddedBy {
  id: number;
  first_name: string;
  last_name: string;
}

/** logistics/volunteers/ row (admin). `added_by` set = a local volunteer of
 *  `city` (added_by's referrer city, read live); null = event volunteer. */
export interface EventVolunteer {
  id: number;
  user: VolunteerUser;
  role: VolunteerRole | null;
  city?: CityRef | null;
  added_by?: VolunteerAddedBy | null;
}

export interface VolunteerCandidate extends VolunteerUser {
  is_volunteer: boolean;
}

/** logistics/city-volunteers/ row (referrer). */
export interface CityVolunteer {
  id: number;
  user: VolunteerUser & { phone: string | null; telegram: string | null };
  added_by: VolunteerAddedBy;
  created_at: string;
}

export type CityVolunteerCandidate = VolunteerCandidate;
