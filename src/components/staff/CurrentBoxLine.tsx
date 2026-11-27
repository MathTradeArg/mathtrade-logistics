"use client";

import Link from 'next/link';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { boxLabel } from '@/hooks/boxes/boxGrouping';
import type { GameCurrentBox } from '@/types';

/** "En caja #12 · Santa Fe → AMBA · abierta". */
export function currentBoxText(box: GameCurrentBox): string {
  const label = box.number == null
    ? 'en armado'
    : `#${boxLabel({ number: box.number, origin: box.origin_id, destination_code: box.destination_code })}`;
  return `En caja ${label} · ${box.origin_name} → ${box.destination_name} · ${box.closed ? 'cerrada' : 'abierta'}`;
}

/** Read-only screen of the box at the event: boxes coming from a city
 *  (to AMBA or in transit). Boxes leaving AMBA have no such screen. */
export function currentBoxHref(box: GameCurrentBox): string | null {
  return box.origin_id === EVENT_LOCATION_ID ? null : `/boxes/in/${box.origin_id}/${box.id}`;
}

/** The box a game is in now. Nothing when it is in no box, or when an older
 *  backend does not send `box`. `linked={false}` inside a clickable row. */
export default function CurrentBoxLine({
  box,
  linked = true,
  className = 'mt-0.5',
}: {
  box: GameCurrentBox | null | undefined;
  linked?: boolean;
  className?: string;
}) {
  if (!box) return null;
  const text = currentBoxText(box);
  const href = linked ? currentBoxHref(box) : null;
  return (
    <p className={`${className} text-body text-gray-900`}>
      {href ? <Link href={href} className="font-semibold text-primary underline">{text}</Link> : text}
    </p>
  );
}
