"use client";

import { StaffDialog } from '@/components/staff';
import type { AddSummary } from '@/hooks/boxes/addByCode';

/** After a batch with failures: how many went in and, for each game that did
 *  not, its label code, title and the reason. */
export default function AddResultDialog({ summary, onClose }: {
  summary: AddSummary | null;
  onClose: () => void;
}) {
  const open = summary != null && summary.failed.length > 0;
  const added = summary?.added.length ?? 0;
  const title = added === 0
    ? 'No se pudo agregar ningún juego:'
    : `Se agregaron ${added} ${added === 1 ? 'juego' : 'juegos'}. No se pudieron agregar:`;
  return (
    <StaffDialog open={open} title={title} confirmLabel="OK" onConfirm={onClose}>
      <ul className="flex flex-col gap-2">
        {summary?.failed.map(({ tradeId, line }) => (
          <li key={tradeId}>{line}</li>
        ))}
      </ul>
    </StaffDialog>
  );
}
