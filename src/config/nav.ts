import type { CityAccess } from '@/types/city';
import type { VolunteerRole } from '@/types/volunteer';

export type NavSlotId =
  | 'receive' | 'arrive' | 'pack' | 'deliver' | 'lookup' | 'more'
  | 'cityBoxes' | 'cityShipments' | 'cityReceived';

export type NavSlot = {
  id: NavSlotId;
  href: string;
  label: string;
  disabled?: boolean;
};

export function isBarePath(pathname: string | null): boolean {
  if (!pathname) return true;
  return pathname === '/login' || pathname.startsWith('/display');
}

function phaseSlots(eventPhase: number | null): NavSlot[] {
  if (eventPhase === 2) {
    return [
      { id: 'deliver', href: '/deliver', label: 'Entregar' },
      { id: 'receive', href: '/receive', label: 'Recibir' },
      { id: 'pack', href: '/boxes/out', label: 'Empacar' },
      { id: 'more', href: '/more', label: 'Más' },
    ];
  }

  if (eventPhase === 1) {
    return [
      { id: 'receive', href: '/receive', label: 'Recibir' },
      { id: 'arrive', href: '/boxes/in', label: 'Llegan' },
      { id: 'pack', href: '/boxes/out', label: 'Empacar' },
      { id: 'more', href: '/more', label: 'Más' },
    ];
  }

  return [
    { id: 'receive', href: '/receive', label: 'Recibir', disabled: true },
    { id: 'arrive', href: '/boxes/in', label: 'Llegan', disabled: true },
    { id: 'pack', href: '/boxes/out', label: 'Empacar', disabled: true },
    { id: 'more', href: '/more', label: 'Más' },
  ];
}

const ROLE_SLOTS: Record<VolunteerRole, NavSlotId[]> = {
  window: ['receive', 'deliver'],
  boxes: ['arrive', 'pack'],
  runner: [],
};
const LOOKUP_SLOT: NavSlot = { id: 'lookup', href: '/lookup', label: 'Consultar' };

export type NavAccess = { role: VolunteerRole | null; isAdmin: boolean; city?: CityAccess };

const MORE_SLOT: NavSlot = { id: 'more', href: '/more', label: 'Más' };
const CITY_BOXES_SLOT: NavSlot = { id: 'cityBoxes', href: '/city/boxes', label: 'Armar' };
const CITY_SHIPMENTS_SLOT: NavSlot = { id: 'cityShipments', href: '/city/shipments', label: 'Envíos' };
const CITY_RECEIVED_SLOT: NavSlot = { id: 'cityReceived', href: '/city/received', label: 'Recibidas' };

/** Nav of a city user without an event role; it doesn't depend on the phase.
 *  A local volunteer's Envíos only has the Ejemplares tab. */
function citySlots(city: NonNullable<CityAccess>): NavSlot[] {
  if (city.kind === 'referrer') {
    return [CITY_BOXES_SLOT, CITY_SHIPMENTS_SLOT, CITY_RECEIVED_SLOT, MORE_SLOT];
  }
  return [CITY_BOXES_SLOT, CITY_SHIPMENTS_SLOT, MORE_SLOT];
}

/** Slots by phase, narrowed to the volunteer's role (design decision 6).
 *  Admins keep the full phase nav; the default keeps that behaviour. */
export function getBottomNavSlots(
  eventPhase: number | null,
  access: NavAccess = { role: null, isAdmin: true },
): NavSlot[] {
  if (!access.isAdmin && !access.role && access.city) return citySlots(access.city);
  const slots = phaseSlots(eventPhase);
  if (access.isAdmin) return slots;
  const allowed = access.role ? ROLE_SLOTS[access.role] : [];
  const filtered = slots.filter((s) => s.id === 'more' || allowed.includes(s.id));
  if (access.role === 'runner') filtered.splice(filtered.length - 1, 0, LOOKUP_SLOT);
  return filtered;
}

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/city/boxes')) return 'Armar cajas';
  if (pathname.startsWith('/city/instructivo')) return 'Instructivo';
  if (pathname.startsWith('/city/shipments')) return 'Envíos';
  if (pathname.startsWith('/city/received')) return 'Recibidas';
  if (pathname.startsWith('/city/users')) return 'Usuarios';
  if (pathname.startsWith('/city/volunteers')) return 'Voluntarios';
  if (pathname === '/city' || pathname.startsWith('/city/')) return 'Mi ciudad';
  if (pathname.startsWith('/select-role')) return 'Tu rol';
  if (pathname.startsWith('/lookup')) return 'Consultar';
  if (pathname.startsWith('/receive')) return 'Recibir';
  if (pathname.startsWith('/deliver')) return 'Entregar';
  if (pathname.startsWith('/boxes/out')) return 'Empacar';
  if (pathname === '/boxes/in/loose' || pathname.startsWith('/boxes/in/loose/')) return 'Sueltos';
  if (pathname.startsWith('/boxes/in')) return 'Llegan';
  if (pathname.startsWith('/boxes')) return 'Cajas';
  if (pathname === '/reports/all' || pathname.startsWith('/reports/all/')) return 'Reportes';
  if (pathname.startsWith('/reports')) return 'Reportar';
  if (pathname === '/more/role' || pathname.startsWith('/more/role/')) return 'Mi rol';
  if (pathname.startsWith('/more/tools/amba-pending')) return 'Pendientes AMBA';
  if (pathname.startsWith('/more/reports/amba-missing')) return 'Faltantes AMBA';
  if (pathname.startsWith('/more/tools')) return 'Herramientas';
  if (pathname.startsWith('/more/report') && !pathname.startsWith('/more/reports')) return 'Nuevo reporte';
  if (pathname.startsWith('/more/reports')) return 'Reportes';
  if (pathname.startsWith('/more')) return 'Más';
  if (pathname.startsWith('/admin/volunteers')) return 'Voluntarios';
  if (pathname.startsWith('/admin/window-config')) return 'Ventanillas';
  if (pathname.startsWith('/admin/ready-to-pickup')) return 'Usuarios';
  return '';
}

export function shouldShowBack(pathname: string): boolean {
  if (pathname.startsWith('/city/')) return true;
  if (pathname.startsWith('/admin')) return true;
  if (pathname === '/reports/all' || pathname.startsWith('/reports/all/')) return true;
  if (pathname.startsWith('/more/') && pathname !== '/more') return true;
  if (pathname.startsWith('/boxes/in/') && pathname !== '/boxes/in') return true;
  if (pathname.startsWith('/boxes/out/') && pathname !== '/boxes/out') return true;
  return false;
}

function pathMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSlotActive(
  pathname: string,
  slot: NavSlot,
  eventPhase: number | null,
  slots?: NavSlot[],
): boolean {
  if (slot.disabled) return false;

  if (slot.id === 'cityBoxes' || slot.id === 'cityShipments' || slot.id === 'cityReceived') {
    return pathMatches(pathname, slot.href);
  }
  if (slot.id === 'lookup') {
    return pathMatches(pathname, '/lookup');
  }
  if (slot.id === 'receive') {
    return pathMatches(pathname, '/receive') || pathMatches(pathname, '/receive-games');
  }
  if (slot.id === 'deliver') {
    return pathMatches(pathname, '/deliver') || pathMatches(pathname, '/deliver-to-user');
  }
  if (slot.id === 'arrive') {
    return pathMatches(pathname, '/boxes/in') || (pathname === '/boxes' && eventPhase === 1);
  }
  if (slot.id === 'pack') {
    return pathMatches(pathname, '/boxes/out') || (pathname === '/boxes' && eventPhase !== 1);
  }
  if (slot.id === 'more') {
    return (
      pathMatches(pathname, '/more') ||
      pathMatches(pathname, '/reports') ||
      pathMatches(pathname, '/admin') ||
      // Consultar is reached from Más unless the nav has its own slot (runners).
      (pathMatches(pathname, '/lookup') && !(slots ?? []).some((s) => s.id === 'lookup'))
    );
  }
  return pathname === slot.href;
}
