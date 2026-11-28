"use client";

import StaffDialog from '@/components/staff/StaffDialog';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { type ProgressCount, progressPercent, useEventProgress } from '@/hooks/useEventProgress';
import { useState } from 'react';
import { createPortal } from 'react-dom';

function Bar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
    </div>
  );
}

function Row({ label, scope, count }: { label: string; scope: string; count: ProgressCount }) {
  const percent = progressPercent(count.done, count.total);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-heading font-bold text-ink">{percent} %</span>
      </div>
      <Bar percent={percent} label={label} />
      <p className="text-caption text-gray-500">{count.done} de {count.total} · {scope}</p>
    </div>
  );
}

export default function EventProgress() {
  const progress = useEventProgress(true);
  const { eventPhase } = useEventPhase();
  const [open, setOpen] = useState(false);

  if (!progress) return null;

  const { reception, delivery } = progress;
  const delivering = eventPhase === 2;
  const stripCount = delivering ? delivery.games : reception.games;
  const stripLabel = delivering ? 'Entregados' : 'Recibidos';
  const stripPercent = progressPercent(stripCount.done, stripCount.total);

  return (
    <>
      <button
        type="button"
        aria-label="Ver progreso"
        onClick={() => setOpen(true)}
        className="mt-2 block w-full basis-full text-left"
      >
        <div
          role="progressbar"
          aria-label={stripLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stripPercent}
          className="relative h-6 w-full overflow-hidden rounded-full bg-gray-200"
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${stripPercent}%` }} />
          <span className="relative flex h-full items-center justify-between gap-3 px-3 text-caption font-bold text-ink">
            <span>{stripLabel} · {stripPercent} %</span>
            <span>{stripCount.done} / {stripCount.total}</span>
          </span>
        </div>
      </button>
      {open &&
        createPortal(
          <StaffDialog
            open
            title="Progreso del evento"
            hideConfirm
            cancelLabel="Cerrar"
            onCancel={() => setOpen(false)}
          >
            <div className="max-h-[65dvh] space-y-4 overflow-y-auto pr-1">
              <Row label="Juegos recibidos" scope="AMBA y La Plata" count={reception.games} />
              <Row label="Usuarios recibidos" scope="AMBA y La Plata" count={reception.users} />
              <Row label="Juegos del interior recibidos" scope="por caja" count={reception.interior_games} />
              <Row label="Cajas abiertas" scope="del interior a AMBA" count={reception.boxes} />
              <Row label="Usuarios listos para entregarles sus juegos" scope="asistentes" count={delivery.ready} />
              <Row label="Juegos entregados" scope="asistentes" count={delivery.games} />
              <Row label="Usuarios entregados" scope="asistentes" count={delivery.users} />
            </div>
          </StaffDialog>,
          document.body,
        )}
    </>
  );
}
