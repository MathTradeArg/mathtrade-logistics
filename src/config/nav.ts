export type NavSlotId = 'receive' | 'arrive' | 'pack' | 'deliver' | 'more';

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

export function getBottomNavSlots(eventPhase: number | null): NavSlot[] {
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

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/receive')) return 'Recibir';
  if (pathname.startsWith('/deliver')) return 'Entregar';
  if (pathname.startsWith('/boxes/out')) return 'Empacar';
  if (pathname === '/boxes/in/loose' || pathname.startsWith('/boxes/in/loose/')) return 'Sueltos';
  if (pathname.startsWith('/boxes/in')) return 'Llegan';
  if (pathname.startsWith('/boxes')) return 'Cajas';
  if (pathname === '/reports/all' || pathname.startsWith('/reports/all/')) return 'Reportes';
  if (pathname.startsWith('/reports')) return 'Reportar';
  if (pathname.startsWith('/more/tools/amba-pending')) return 'Pendientes AMBA';
  if (pathname.startsWith('/more/reports/amba-missing')) return 'Faltantes AMBA';
  if (pathname.startsWith('/more/tools')) return 'Herramientas';
  if (pathname.startsWith('/more/report') && !pathname.startsWith('/more/reports')) return 'Nuevo reporte';
  if (pathname.startsWith('/more/reports')) return 'Reportes';
  if (pathname.startsWith('/more')) return 'Más';
  if (pathname.startsWith('/admin/window-config')) return 'Ventanillas';
  if (pathname.startsWith('/admin/ready-to-pickup')) return 'Usuarios';
  return '';
}

export function shouldShowBack(pathname: string): boolean {
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

export function isSlotActive(pathname: string, slot: NavSlot, eventPhase: number | null): boolean {
  if (slot.disabled) return false;

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
      pathMatches(pathname, '/admin')
    );
  }
  return pathname === slot.href;
}
