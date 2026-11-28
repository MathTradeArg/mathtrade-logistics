"use client";

import StaffDialog from '@/components/staff/StaffDialog';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { type ProgressCount, progressPercent, useEventProgress } from '@/hooks/useEventProgress';
import { useState } from 'react';
import { createPortal } from 'react-dom';

type Tone = 'reception' | 'delivery';

const FILL: Record<Tone, string> = { reception: 'bg-brand', delivery: 'bg-want' };

const HINT = {
  received:
    'Juegos que traen los usuarios de AMBA, más los del interior que quedan en AMBA. No cuenta los que ya se entregaron mano a mano antes del día del evento. Se marca recibido cuando llega al evento.',
  delivered:
    'Juegos que les corresponden a los asistentes. Se marca entregado cuando el asistente lo retira. No cuenta los entregados mano a mano antes del día del evento.',
};

const INFO_SIZE = {
  row: 'h-[18px] w-[18px] before:-inset-3.5',
  strip: 'h-5 w-5 before:-inset-3',
};

function InfoButton({ label, expanded, onToggle, size = 'row' }: { label: string; expanded: boolean; onToggle: () => void; size?: 'row' | 'strip' }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onToggle}
      className={`group relative inline-flex shrink-0 items-center justify-center rounded-full before:absolute before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink ${INFO_SIZE[size]}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-full w-full items-center justify-center rounded-full border border-brand/40 text-caption font-bold leading-none text-brand-ink ${expanded ? 'bg-brand/40' : 'bg-brand/20 group-hover:bg-brand/30'}`}
      >
        i
      </span>
    </button>
  );
}

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

function Row({ label, scope, count, tone, hint }: { label: string; scope: string; count: ProgressCount; tone: Tone; hint: string }) {
  const percent = progressPercent(count.done, count.total);
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1">
          <span className="font-semibold text-gray-900">{label}</span>
          <InfoButton label={`Qué cuenta ${label}`} expanded={showHint} onToggle={() => setShowHint((v) => !v)} />
        </span>
        <span className="shrink-0 whitespace-nowrap text-heading font-bold text-ink">{percent} %</span>
      </div>
      {showHint && <p role="note" className="text-caption text-gray-500">{hint}</p>}
      <Bar percent={percent} label={label} tone={tone} />
      <p className="text-caption text-gray-500">{count.done} de {count.total} · {scope}</p>
    </div>
  );
}

export default function EventProgress() {
  const progress = useEventProgress(true);
  const { eventPhase } = useEventPhase();
  const [open, setOpen] = useState(false);
  const [showStripHint, setShowStripHint] = useState(false);

  if (!progress) return null;

  const { reception, delivery } = progress;
  const delivering = eventPhase === 2;
  const stripCount = delivering ? delivery.games : reception.games;
  const stripLabel = delivering ? 'Entregados' : 'Recibidos';
  const stripPercent = progressPercent(stripCount.done, stripCount.total);

  const receptionRows = (
    <>
      <Row tone="reception" label="Juegos recibidos" scope="AMBA y La Plata" count={reception.games} hint="Juegos que traen los usuarios de AMBA, más los del interior que quedan en AMBA. No cuenta los entregados mano a mano antes del día del evento." />
      <Row tone="reception" label="Usuarios recibidos" scope="AMBA y La Plata" count={reception.users} hint="Usuarios de AMBA que traen juegos. Cuenta como recibido cuando llegaron todos sus juegos." />
      <Row tone="reception" label="Juegos del interior recibidos" scope="por caja" count={reception.interior_games} hint="Juegos que vienen del interior y pasan por el evento (no van directo), los que quedan en AMBA y los que siguen a otra ciudad." />
      <Row tone="reception" label="Cajas abiertas" scope="del interior a AMBA" count={reception.boxes} hint="Cajas del interior que llegan al evento. Cuenta como abierta cuando todos sus juegos ya fueron recibidos." />
    </>
  );
  const deliveryRows = (
    <>
      <Row tone="delivery" label="Usuarios listos para entregarles sus juegos" scope="asistentes" count={delivery.ready} hint="Asistentes cuyos juegos ya están todos en el evento y listos para retirar." />
      <Row tone="delivery" label="Juegos entregados" scope="asistentes" count={delivery.games} hint="Juegos de los asistentes que ya se retiraron. No cuenta los entregados mano a mano antes del día del evento." />
      <Row tone="delivery" label="Usuarios entregados" scope="asistentes" count={delivery.users} hint="Asistentes que ya retiraron todos sus juegos." />
    </>
  );

  return (
    <>
      <div className="mt-2 w-full basis-full">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Ver progreso"
            onClick={() => setOpen(true)}
            className="block min-w-0 flex-1 text-left"
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
          <InfoButton size="strip" label="Qué cuenta esta barra" expanded={showStripHint} onToggle={() => setShowStripHint((v) => !v)} />
        </div>
        {showStripHint && <p role="note" className="mt-1 text-caption text-gray-500">{delivering ? HINT.delivered : HINT.received}</p>}
      </div>
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
              {delivering ? <>{deliveryRows}{receptionRows}</> : <>{receptionRows}{deliveryRows}</>}
            </div>
          </StaffDialog>,
          document.body,
        )}
    </>
  );
}
