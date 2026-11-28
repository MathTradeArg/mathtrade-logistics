"use client";

import { useRef, useState, type ReactNode } from 'react';
import { LoadingSpinner } from '@/components/common/ui';
import type { HistoryResponse } from '@/types';
// Direct import (not the staff/ui barrels): some page tests mock those barrels.
import { StaffEmpty, StaffError } from './StaffPage';

export function HistoryList<T>({ rows, truncated, renderRow, getKey, emptyText = 'Todavía no hay movimientos registrados.' }: {
  rows: T[];
  truncated: boolean;
  renderRow: (row: T, index: number, all: T[]) => ReactNode;
  getKey: (row: T) => string | number;
  emptyText?: string;
}) {
  if (rows.length === 0) return <StaffEmpty>{emptyText}</StaffEmpty>;
  return (
    <>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((row, i) => (
          <li key={getKey(row)} className="staff-card px-4 py-3 text-gray-900">{renderRow(row, i, rows)}</li>
        ))}
      </ul>
      {truncated && (
        <p className="mt-3 text-caption text-gray-500">
          Hay más movimientos. Se muestran los {rows.length} más recientes.
        </p>
      )}
    </>
  );
}

type LoadState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: HistoryResponse<T> }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

/** Collapsible block. Loads only when opened (no request on page load). `load`
 *  comes from the page's own useApi hook. 404 = backend without the endpoint:
 *  a notice, never a broken page. Remount it with `key` when the subject changes. */
export function HistorySection<T>({ title = 'Historial', load, getKey, renderRow, notice, emptyText }: {
  title?: string;
  load: () => Promise<HistoryResponse<T> | undefined>;
  getKey: (row: T) => string | number;
  renderRow: (row: T, index: number, all: T[]) => ReactNode;
  notice?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState<T>>({ kind: 'idle' });
  const request = useRef(0);

  const fetchRows = async () => {
    const mine = ++request.current;
    setState({ kind: 'loading' });
    try {
      const data = await load();
      if (mine !== request.current) return;
      setState({ kind: 'ready', data: { results: data?.results ?? [], truncated: Boolean(data?.truncated) } });
    } catch (err) {
      if (mine !== request.current) return;
      if ((err as { status?: number } | null)?.status === 404) setState({ kind: 'unavailable' });
      else setState({ kind: 'error', message: err instanceof Error ? err.message : 'No se pudo cargar el historial.' });
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && (state.kind === 'idle' || state.kind === 'unavailable' || state.kind === 'error')) void fetchRows();
  };

  const label = title.toLowerCase();

  return (
    <div>
      <button type="button" className="staff-btn staff-btn-outline mt-3" aria-expanded={open} onClick={toggle}>
        {open ? `Ocultar ${label}` : `Ver ${label}`}
      </button>
      {open && (
        <div>
          {notice && <p className="mt-3 text-caption text-gray-500">{notice}</p>}
          {state.kind === 'loading' && <LoadingSpinner message="Cargando historial..." />}
          {state.kind === 'unavailable' && (
            <StaffEmpty>El historial todavía no está disponible. Probá de nuevo más tarde.</StaffEmpty>
          )}
          {state.kind === 'error' && (
            <>
              <StaffError>{state.message}</StaffError>
              <button type="button" className="staff-btn staff-btn-outline" onClick={() => void fetchRows()}>
                Reintentar
              </button>
            </>
          )}
          {state.kind === 'ready' && (
            <HistoryList<T>
              rows={state.data.results}
              truncated={state.data.truncated}
              getKey={getKey}
              renderRow={renderRow}
              emptyText={emptyText}
            />
          )}
        </div>
      )}
    </div>
  );
}
