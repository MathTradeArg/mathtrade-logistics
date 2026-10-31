export type VolunteerRole = 'window' | 'boxes' | 'runner';

export interface VolunteerUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface EventVolunteer {
  id: number;
  user: VolunteerUser;
  role: VolunteerRole | null;
}

export interface VolunteerCandidate extends VolunteerUser {
  is_volunteer: boolean;
}
