"use client";

import StaffDialog from '@/components/staff/StaffDialog';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { type ProgressCount, progressPercent, useEventProgress } from '@/hooks/useEventProgress';
import { useState } from 'react';
import { createPortal } from 'react-dom';

type Tone = 'reception' | 'delivery';

const FILL: Record<Tone, string> = { reception: 'bg-brand', delivery: 'bg-want' };

function Bar({ percent, label, tone }: { percent: number; label: string; tone: Tone }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
    >
      <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function Row({ label, scope, count, tone }: { label: string; scope: string; count: ProgressCount; tone: Tone }) {
  const percent = progressPercent(count.done, count.total);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-heading font-bold text-ink">{percent} %</span>
      </div>
      <Bar percent={percent} label={label} tone={tone} />
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
          <div className={`absolute inset-y-0 left-0 rounded-full ${FILL[delivering ? 'delivery' : 'reception']}`} style={{ width: `${stripPercent}%` }} />
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
              <Row tone="reception" label="Juegos recibidos" scope="AMBA y La Plata" count={reception.games} />
              <Row tone="reception" label="Usuarios recibidos" scope="AMBA y La Plata" count={reception.users} />
              <Row tone="reception" label="Juegos del interior recibidos" scope="por caja" count={reception.interior_games} />
              <Row tone="reception" label="Cajas abiertas" scope="del interior a AMBA" count={reception.boxes} />
              <Row tone="delivery" label="Usuarios listos para entregarles sus juegos" scope="asistentes" count={delivery.ready} />
              <Row tone="delivery" label="Juegos entregados" scope="asistentes" count={delivery.games} />
              <Row tone="delivery" label="Usuarios entregados" scope="asistentes" count={delivery.users} />
            </div>
          </StaffDialog>,
          document.body,
        )}
    </>
  );
}
