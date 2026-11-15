"use client";

import { getBottomNavSlots, isSlotActive, type NavSlotId } from '@/config/nav';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowCircleRight, DotsThreeOutline, MagnifyingGlass, Package, QrCode, SquaresFour, Tray, Truck } from 'phosphor-react';

const ICONS: Record<NavSlotId, typeof QrCode> = {
  receive: QrCode,
  arrive: Tray,
  pack: Package,
  deliver: ArrowCircleRight,
  tables: SquaresFour,
  lookup: MagnifyingGlass,
  more: DotsThreeOutline,
  cityBoxes: Package,
  cityShipments: Truck,
  cityReceived: Tray,
};

export default function BottomNav() {
  const pathname = usePathname();
  const { eventPhase } = useEventPhase();
  const { role, isAdmin, cityAccess } = useAuth();
  const slots = getBottomNavSlots(eventPhase, { role, isAdmin, city: cityAccess });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-nav border-t border-white/15 bg-ink pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <ul
        className="grid h-14"
        style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}
      >
        {slots.map((slot) => {
          const Icon = ICONS[slot.id];
          const active = isSlotActive(pathname ?? '', slot, eventPhase, slots);
          // The cell (link/span) keeps the full tap area; the visible pill is the inner span, inset by the cell padding.
          const itemClass = clsx(
            'staff-nav-item block h-full w-full p-1.5 text-caption font-semibold',
            slot.disabled && 'cursor-not-allowed text-white/50',
            !slot.disabled && active && 'text-brand-ink',
            !slot.disabled && !active && 'text-[#cfcbe6]',
          );
          const pillClass = clsx(
            'staff-nav-pill flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-2xl',
            !slot.disabled && active && 'bg-brand',
          );

          return (
            <li key={slot.id} className="h-full">
              {slot.disabled ? (
                <span className={itemClass} aria-disabled="true">
                  <span className={pillClass}>
                    <Icon size={22} weight={active ? 'fill' : 'regular'} />
                    {slot.label}
                  </span>
                </span>
              ) : (
                <Link
                  href={slot.href}
                  className={itemClass}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={pillClass}>
                    <Icon size={22} weight={active ? 'fill' : 'regular'} />
                    {slot.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
