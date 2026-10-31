import type { CityAccess } from '@/types/city';
import type { VolunteerRole } from '@/types/volunteer';

export const ROLE_ORDER: VolunteerRole[] = ['window', 'boxes', 'runner'];

export const ROLES: Record<VolunteerRole, { label: string; description: string; prefixes: string[] }> = {
  window: {
    label: 'Ventanilla',
    description: 'Recibís los juegos que traen los participantes y les entregás los que se llevan.',
    prefixes: ['/receive', '/receive-games', '/deliver', '/deliver-to-user'],
  },
  boxes: {
    label: 'Cajas',
    description: 'Armás y desarmás las cajas que viajan desde y hacia otras ciudades.',
    prefixes: ['/boxes'],
  },
  runner: {
    label: 'Runner',
    description: 'Llevás y traés juegos entre las mesas y las ventanillas, y buscás lo que no aparece.',
    prefixes: [],
  },
};

// Open to every volunteer whatever the role.
const ALWAYS_ALLOWED = ['/more', '/lookup', '/select-role', '/reports', '/login', '/display'];

// A city user (referrer / local volunteer) without an event role.
const CITY_ONLY_ALLOWED = ['/more', '/login', '/city'];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Roles are enforced in the UI only (the API accepts any volunteer of the
 *  active edition): this decides where StaffChrome's guard lets a volunteer
 *  stay. Admins go everywhere. A city user also gets `/city`; without a role
 *  they only get `/city` and Más. */
export function isPathAllowed(
  pathname: string,
  role: VolunteerRole | null,
  isAdmin: boolean,
  city: CityAccess = null,
): boolean {
  if (isAdmin) return true;
  if (pathname === '/') return true;
  if (city && matches(pathname, '/city')) return true;
  if (!role && city) return CITY_ONLY_ALLOWED.some((p) => matches(pathname, p));
  if (ALWAYS_ALLOWED.some((p) => matches(pathname, p))) return true;
  if (!role) return false;
  return ROLES[role].prefixes.some((p) => matches(pathname, p));
}

export function roleHome(role: VolunteerRole, eventPhase: number | null): string {
  if (role === 'runner') return '/lookup';
  if (eventPhase === 1) return role === 'window' ? '/receive' : '/boxes/in';
  if (eventPhase === 2) return role === 'window' ? '/deliver' : '/boxes/out';
  return '/';
}

/** Where the guard sends a user who is somewhere they may not be. */
export function homeFor(role: VolunteerRole | null, eventPhase: number | null, city: CityAccess): string {
  if (!role && city) return '/city';
  return role ? roleHome(role, eventPhase) : '/';
}
