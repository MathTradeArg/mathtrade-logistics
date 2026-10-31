"use client";

import { boxGoesViaHub, boxLabel, destinationLabel } from '@/hooks/boxes/boxGrouping';
import type { Tracking } from '@/types';

/** Code, destination, boxes, counts and the receipt thumbnail of a shipment. */
export default function TrackingSummary({
  tracking,
  onOpenImage,
}: {
  tracking: Tracking;
  onOpenImage: (url: string) => void;
}) {
  const destinationName = destinationLabel(
    tracking.boxes[0]?.destination_name || `Destino ${tracking.destiny}`,
    tracking.boxes.some((box) => boxGoesViaHub(box)),
  );
  const labels = tracking.boxes.map(boxLabel).join(', ');
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1 text-sm text-gray-700">
        <p className="text-base font-semibold text-gray-900">{tracking.tracking_code}</p>
        <p>{destinationName}</p>
        <p>Cajas: {labels || '—'}</p>
        <p>{tracking.item_count} juegos</p>
        <p>
          ${tracking.price ?? '—'} · {tracking.weight ?? '—'} kg
        </p>
      </div>
      {tracking.image ? (
        <button
          type="button"
          onClick={() => onOpenImage(tracking.image as string)}
          aria-label="Ver comprobante"
          className="shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tracking.image} alt="Comprobante" className="h-20 w-20 rounded-md object-cover" />
        </button>
      ) : (
        <span className="shrink-0 text-xs text-gray-500">Sin comprobante</span>
      )}
    </div>
  );
}
