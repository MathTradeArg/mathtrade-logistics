"use client";

import { getBottomNavSlots, isSlotActive, type NavSlotId } from '@/config/nav';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowCircleRight, DotsThreeOutline, Package, QrCode, Tray } from 'phosphor-react';

const ICONS: Record<NavSlotId, typeof QrCode> = {
  receive: QrCode,
  arrive: Tray,
  pack: Package,
  deliver: ArrowCircleRight,
  more: DotsThreeOutline,
};

export default function BottomNav() {
  const pathname = usePathname();
  const { eventPhase } = useEventPhase();
  const slots = getBottomNavSlots(eventPhase);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-black shadow-[0_-4px_16px_rgba(0,0,0,0.2)]"
      aria-label="Navegación principal"
    >
      <ul className="grid h-14 grid-cols-4">
        {slots.map((slot) => {
          const Icon = ICONS[slot.id];
          const active = isSlotActive(pathname ?? '', slot, eventPhase);
          const itemClass = clsx(
            'staff-nav-item flex h-full w-full flex-col items-center justify-center gap-0.5 pb-[env(safe-area-inset-bottom)] text-[10px] font-semibold',
            slot.disabled && 'cursor-not-allowed text-[#6b7280]',
            !slot.disabled && active && 'text-primary',
            !slot.disabled && !active && 'text-[#b7bcc4]',
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
