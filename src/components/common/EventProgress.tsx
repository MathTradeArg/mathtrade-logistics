"use client";

import StaffDialog from '@/components/staff/StaffDialog';
import { progressPercent, useEventProgress } from '@/hooks/useEventProgress';
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

function Row({ label, done, total }: { label: string; done: number; total: number }) {
  const percent = progressPercent(done, total);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-heading font-bold text-ink">{percent} %</span>
      </div>
      <Bar percent={percent} label={label} />
      <p className="text-caption text-gray-500">{done} de {total}</p>
    </div>
  );
}

export default function EventProgress() {
  const progress = useEventProgress(true);
  const [open, setOpen] = useState(false);

  if (!progress) return null;

  const { games, users } = progress;
  const gamesPercent = progressPercent(games.received, games.total);

  return (
    <>
      <button
        type="button"
        aria-label="Ver progreso"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full basis-full items-center gap-3 text-left"
      >
        <span className="text-caption font-semibold text-gray-700">Recibidos</span>
        <span className="flex-1">
          <Bar percent={gamesPercent} label="Juegos recibidos" />
        </span>
        <span className="text-caption font-bold text-ink">{gamesPercent} %</span>
        <span className="text-caption text-gray-500">{games.received} / {games.total}</span>
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
            <div className="space-y-4">
              <Row label="Juegos recibidos" done={games.received} total={games.total} />
              <Row label="Usuarios listos para retirar" done={users.ready} total={users.total} />
              <Row label="Usuarios que ya retiraron" done={users.received} total={users.total} />
            </div>
          </StaffDialog>,
          document.body,
        )}
    </>
  );
}
