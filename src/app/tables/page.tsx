"use client";

import { LoadingSpinner } from '@/components/common/ui';
import {
  StaffDialog,
  StaffEmpty,
  StaffPage,
  StaffSearch,
  StaffSegmented,
} from '@/components/staff';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth, type MeResponse } from '@/hooks/useAuth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatTradeCode, tradeCodeSearchText } from '@/utils/tradeCode';

export interface TableVolunteerRef {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
}

export interface TableRecipientGame {
  trade_id: number;
  assigned_trade_code: number;
  title: string;
  status: number;
  status_display: string;
  from_first_name: string;
  from_last_name: string;
  from_location: string;
}

export interface TableRecipient {
  membership_id: number;
  user_id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  username: string;
  table_number: string;
  status: string | null;
  games_total: number;
  games_ready: number;
  games_missing: number;
  games_delivered: number;
  pending_drop_off_count: number;
  is_table_complete: boolean;
  is_ready_to_pickup: boolean;
  games: TableRecipientGame[];
}

export interface EventTableSummary {
  recipients_total: number;
  recipients_ready: number;
  recipients_complete_on_table: number;
  games_total: number;
  games_on_table: number;
  games_missing: number;
  games_delivered: number;
}

export interface EventTableData {
  table_number: string;
  volunteers: TableVolunteerRef[];
  summary: EventTableSummary;
  recipients: TableRecipient[];
}

export interface EventTablesResponse {
  all_tables: string[];
  assigned_tables: string[];
  tables: EventTableData[];
}

type ViewTab = 'recipients' | 'ready' | 'missing';

const MINE_FILTER = '__mine__';
const ALL_FILTER = '__all__';

function recipientFullName(r: { first_name: string; last_name: string; username?: string }) {
  const full = `${r.last_name || ''} ${r.first_name || ''}`.trim();
  return full || r.username || 'Sin nombre';
}

function senderFullName(g: TableRecipientGame) {
  return `${g.from_first_name || ''} ${g.from_last_name || ''}`.trim() || 'Participante';
}

export default function TablesPage() {
  const {
    isAuthenticated,
    isAdmin,
    isLoading: authIsLoading,
    tables: authTables,
    applyTables,
  } = useAuth();
  const { setSuccess, setError } = useActionStatus();

  const { execute: fetchTables } = useApi<EventTablesResponse>('logistics/tables/');
  const { execute: patchMe } = useApi<MeResponse>('logistics/me/', { method: 'PATCH' });

  const [data, setData] = useState<EventTablesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ViewTab>('recipients');
  const [tableFilter, setTableFilter] = useState<string>(MINE_FILTER);
  const [query, setQuery] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [draftTables, setDraftTables] = useState<string[]>([]);
  const [customTableInput, setCustomTableInput] = useState('');
  const [savingTables, setSavingTables] = useState(false);

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchTables();
      if (res) {
        setData(res);
        if (Array.isArray(res.assigned_tables) && applyTables) {
          applyTables(res.assigned_tables);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las mesas.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchTables, applyTables, setError]);

  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      loadTables();
    }
  }, [authIsLoading, isAuthenticated, loadTables]);

  const myAssignedTables = useMemo(() => {
    if (data?.assigned_tables) return data.assigned_tables;
    return authTables ?? [];
  }, [data?.assigned_tables, authTables]);

  // If the user has no assigned tables yet (e.g. admin or new volunteer), default filter to ALL_FILTER
  const effectiveTableFilter = useMemo(() => {
    if (tableFilter === MINE_FILTER && myAssignedTables.length === 0) {
      return ALL_FILTER;
    }
    return tableFilter;
  }, [tableFilter, myAssignedTables]);

  const visibleTables = useMemo(() => {
    const all = data?.tables ?? [];
    if (effectiveTableFilter === ALL_FILTER) return all;
    if (effectiveTableFilter === MINE_FILTER) {
      const set = new Set(myAssignedTables);
      return all.filter((t) => set.has(t.table_number));
    }
    return all.filter((t) => t.table_number === effectiveTableFilter);
  }, [data?.tables, effectiveTableFilter, myAssignedTables]);

  const allRecipients = useMemo(() => {
    const list: TableRecipient[] = [];
    for (const tbl of visibleTables) {
      for (const rec of tbl.recipients) {
        list.push(rec);
      }
    }
    return list.sort((a, b) => {
      const cmp = recipientFullName(a).localeCompare(recipientFullName(b), 'es');
      if (cmp !== 0) return cmp;
      return a.table_number.localeCompare(b.table_number, 'es', { numeric: true });
    });
  }, [visibleTables]);

  const filteredRecipients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRecipients;
    return allRecipients.filter((rec) => {
      const name = `${rec.first_name} ${rec.last_name} ${rec.username}`.toLowerCase();
      const tableMatch = `mesa ${rec.table_number}`.toLowerCase().includes(q) || rec.table_number.toLowerCase() === q;
      const gameMatch = rec.games.some(
        (g) =>
          tradeCodeSearchText(g.assigned_trade_code).includes(q) ||
          g.title.toLowerCase().includes(q) ||
          `${g.from_first_name} ${g.from_last_name}`.toLowerCase().includes(q) ||
          g.from_location.toLowerCase().includes(q),
      );
      return name.includes(q) || tableMatch || gameMatch;
    });
  }, [allRecipients, query]);

  const readyRecipients = useMemo(
    () => filteredRecipients.filter((rec) => rec.is_table_complete),
    [filteredRecipients],
  );

  const missingGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{ game: TableRecipientGame; recipient: TableRecipient }> = [];
    for (const rec of allRecipients) {
      for (const game of rec.games) {
        if (game.status >= 5) continue;
        if (q) {
          const matches =
            tradeCodeSearchText(game.assigned_trade_code).includes(q) ||
            game.title.toLowerCase().includes(q) ||
            `${rec.first_name} ${rec.last_name} ${rec.username}`.toLowerCase().includes(q) ||
            `${game.from_first_name} ${game.from_last_name}`.toLowerCase().includes(q) ||
            game.from_location.toLowerCase().includes(q) ||
            rec.table_number.toLowerCase().includes(q);
          if (!matches) continue;
        }
        items.push({ game, recipient: rec });
      }
    }
    return items.sort((a, b) => a.game.assigned_trade_code - b.game.assigned_trade_code);
  }, [allRecipients, query]);

  const totals = useMemo(() => {
    return visibleTables.reduce(
      (acc, t) => ({
        recipients_total: acc.recipients_total + t.summary.recipients_total,
        recipients_ready: acc.recipients_ready + t.summary.recipients_ready,
        recipients_complete_on_table:
          acc.recipients_complete_on_table + t.summary.recipients_complete_on_table,
        games_total: acc.games_total + t.summary.games_total,
        games_on_table: acc.games_on_table + t.summary.games_on_table,
        games_missing: acc.games_missing + t.summary.games_missing,
      }),
      {
        recipients_total: 0,
        recipients_ready: 0,
        recipients_complete_on_table: 0,
        games_total: 0,
        games_on_table: 0,
        games_missing: 0,
      },
    );
  }, [visibleTables]);

  const selectableTables = useMemo(() => {
    const set = new Set<string>(data?.all_tables ?? []);
    draftTables.forEach((t) => set.add(t));
    myAssignedTables.forEach((t) => set.add(t));
    return [...set].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [data?.all_tables, draftTables, myAssignedTables]);

  const openAssignModal = () => {
    setDraftTables([...myAssignedTables]);
    setCustomTableInput('');
    setAssignModalOpen(true);
  };

  const toggleDraftTable = (tableNumber: string) => {
    setDraftTables((prev) =>
      prev.includes(tableNumber) ? prev.filter((t) => t !== tableNumber) : [...prev, tableNumber],
    );
  };

  const addCustomTable = () => {
    const trimmed = customTableInput.trim();
    if (!trimmed) return;
    if (!draftTables.includes(trimmed)) {
      setDraftTables((prev) => [...prev, trimmed]);
    }
    setCustomTableInput('');
  };

  const handleSaveMyTables = async () => {
    setSavingTables(true);
    try {
      const res = await patchMe({ tables: draftTables });
      const updated = res?.tables ?? draftTables;
      if (applyTables) applyTables(updated);
      setAssignModalOpen(false);
      setTableFilter(updated.length > 0 ? MINE_FILTER : ALL_FILTER);
      setSuccess(
        updated.length > 0
          ? `Mesas asignadas: ${updated.map((t) => `Mesa ${t}`).join(', ')}.`
          : 'Quitaste tus mesas asignadas.',
      );
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar tus mesas.');
    } finally {
      setSavingTables(false);
    }
  };

  if (authIsLoading || isAuthenticated === null) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <LoadingSpinner message="Cargando..." />
      </div>
    );
  }

  return (
    <StaffPage>
      <div className="staff-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Mis mesas asignadas
          </p>
          {myAssignedTables.length > 0 ? (
            <p className="mt-1 text-base font-bold text-gray-900">
              {myAssignedTables.map((t) => `Mesa ${t}`).join(' · ')}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              No tenés mesas asignadas todavía.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAssignModal}
            className="staff-btn staff-btn-primary !min-h-10 !w-auto !px-4 text-sm"
          >
            {myAssignedTables.length > 0 ? 'Cambiar mis mesas' : 'Asignarme mesas'}
          </button>
          <button
            type="button"
            onClick={loadTables}
            disabled={isLoading}
            className="staff-btn staff-btn-outline !min-h-10 !w-auto !px-3 text-sm"
          >
            Actualizar
          </button>
        </div>
      </div>

      {(data?.all_tables?.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por mesa">
          {myAssignedTables.length > 0 && (
            <button
              type="button"
              onClick={() => setTableFilter(MINE_FILTER)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                effectiveTableFilter === MINE_FILTER
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Mis mesas ({myAssignedTables.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setTableFilter(ALL_FILTER)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              effectiveTableFilter === ALL_FILTER
                ? 'bg-primary text-white'
                : 'border border-gray-200 bg-white text-gray-700'
            }`}
          >
            Todas ({data?.all_tables.length ?? 0})
          </button>
          {(data?.all_tables ?? []).map((tbl) => (
            <button
              key={tbl}
              type="button"
              onClick={() => setTableFilter(tbl)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                effectiveTableFilter === tbl
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Mesa {tbl}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="staff-card p-3 text-center">
          <p className="text-xs text-gray-500">Listos en mesa</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {totals.recipients_complete_on_table}/{totals.recipients_total}
          </p>
        </div>
        <div className="staff-card p-3 text-center">
          <p className="text-xs text-gray-500">Juegos en mesa</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            {totals.games_on_table}/{totals.games_total}
          </p>
        </div>
        <div className="staff-card p-3 text-center">
          <p className="text-xs text-gray-500">Juegos faltantes</p>
          <p className="mt-1 text-lg font-bold text-amber-700">
            {totals.games_missing}
          </p>
        </div>
      </div>

      <StaffSearch
        className="mt-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por #código, juego, receptor o mesa"
        aria-label="Buscar en las mesas"
      />

      <div className="mt-4">
        <StaffSegmented
          value={tab}
          onChange={setTab}
          options={[
            { id: 'recipients', label: `Por receptor (${filteredRecipients.length})` },
            { id: 'ready', label: `Listos (${readyRecipients.length})` },
            { id: 'missing', label: `Faltan (${missingGames.length})` },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <LoadingSpinner message="Cargando mesas..." />
        </div>
      ) : tab === 'missing' ? (
        missingGames.length === 0 ? (
          <StaffEmpty>No faltan juegos en las mesas seleccionadas.</StaffEmpty>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {missingGames.map(({ game, recipient }) => (
              <li
                key={game.trade_id}
                className="staff-card flex flex-col gap-1 border-l-4 border-amber-500 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-gray-900">
                    {formatTradeCode(game.assigned_trade_code)} · {game.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Mesa {recipient.table_number}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  Receptor: {recipientFullName(recipient)} (@{recipient.username})
                </p>
                <p className="text-xs text-gray-600">
                  De: {senderFullName(game)}
                  {game.from_location ? ` (${game.from_location})` : ''} · Estado: {game.status_display}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : (
        (() => {
          const list = tab === 'ready' ? readyRecipients : filteredRecipients;
          if (list.length === 0) {
            return (
              <StaffEmpty>
                {tab === 'ready'
                  ? 'Todavía no hay receptores con todos sus juegos listos en estas mesas.'
                  : 'No hay receptores para mostrar en las mesas seleccionadas.'}
              </StaffEmpty>
            );
          }
          return (
            <ul className="mt-4 flex flex-col gap-4">
              {list.map((rec) => {
                const allDelivered = rec.games_total > 0 && rec.games_delivered === rec.games_total;
                return (
                  <li
                    key={`${rec.table_number}-${rec.membership_id}`}
                    className={`staff-card p-4 ${
                      rec.is_ready_to_pickup
                        ? 'border-l-4 border-emerald-500'
                        : rec.is_table_complete
                          ? 'border-l-4 border-sky-500'
                          : 'border-l-4 border-amber-500'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          {recipientFullName(rec)}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{rec.username} · Mesa {rec.table_number} · {rec.games_ready}/{rec.games_total} en mesa
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {allDelivered ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            Entregado
                          </span>
                        ) : rec.is_ready_to_pickup ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            Listo para retirar
                          </span>
                        ) : rec.is_table_complete ? (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                            Mesa completa · debe entregar {rec.pending_drop_off_count}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            Faltan {rec.games_missing} de {rec.games_total}
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100 pt-2">
                      {rec.games.map((g) => {
                        const isReady = g.status === 5;
                        const isDelivered = g.status === 6;
                        return (
                          <li
                            key={g.trade_id}
                            className="flex items-center justify-between gap-2 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {formatTradeCode(g.assigned_trade_code)} · {g.title}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                De {senderFullName(g)}
                                {g.from_location ? ` (${g.from_location})` : ''}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                isReady
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isDelivered
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isReady ? 'En mesa' : isDelivered ? 'Entregado' : 'Falta'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          );
        })()
      )}

      <StaffDialog
        open={assignModalOpen}
        title="Elegir mis mesas"
        confirmLabel={savingTables ? 'Guardando...' : 'Guardar mis mesas'}
        confirmDisabled={savingTables}
        onConfirm={handleSaveMyTables}
        onCancel={() => {
          if (!savingTables) setAssignModalOpen(false);
        }}
      >
        <p className="text-sm text-gray-600">
          Tocá las mesas que vas a ordenar hoy:
        </p>
        {selectableTables.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectableTables.map((tbl) => {
              const selected = draftTables.includes(tbl);
              return (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => toggleDraftTable(tbl)}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
                    selected
                      ? 'bg-primary text-white'
                      : 'border border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  Mesa {tbl}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Todavía no hay mesas generadas; podés ingresar el número manualmente abajo.
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={customTableInput}
            onChange={(e) => setCustomTableInput(e.target.value)}
            placeholder="Ej: 01"
            aria-label="Agregar número de mesa"
            className="min-h-10 flex-1 rounded-full border border-gray-200 bg-white px-3 text-sm"
          />
          <button
            type="button"
            onClick={addCustomTable}
            className="staff-btn staff-btn-outline !min-h-10 !w-auto !px-4 text-sm"
          >
            Agregar
          </button>
        </div>
        {isAdmin && (
          <p className="mt-3 text-xs text-gray-500">
            Para asignar mesas a otros voluntarios andá a Admin → Voluntarios.
          </p>
        )}
      </StaffDialog>
    </StaffPage>
  );
}
