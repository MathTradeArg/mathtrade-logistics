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
      className="fixed inset-x-0 bottom-0 z-nav border-t border-white/15 bg-ink"
      aria-label="Navegación principal"
    >
      <ul
        className="grid h-14"
        style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}
      >
        {slots.map((slot) => {
          const Icon = ICONS[slot.id];
          const active = isSlotActive(pathname ?? '', slot, eventPhase, slots);
          const itemClass = clsx(
            'staff-nav-item flex h-full w-full flex-col rounded-xl items-center justify-center gap-0.5 pb-[env(safe-area-inset-bottom)] text-caption font-semibold',
            slot.disabled && 'cursor-not-allowed text-white/50',
            !slot.disabled && active && 'bg-brand text-brand-ink',
            !slot.disabled && !active && 'text-[#cfcbe6]',
          );

          return (
            <li key={slot.id} className="h-full">
              {slot.disabled ? (
                <span className={itemClass} aria-disabled="true">
                  <Icon size={22} weight={active ? 'fill' : 'regular'} />
                  {slot.label}
                </span>
              ) : (
                <Link
                  href={slot.href}
                  className={itemClass}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={22} weight={active ? 'fill' : 'regular'} />
                  {slot.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
