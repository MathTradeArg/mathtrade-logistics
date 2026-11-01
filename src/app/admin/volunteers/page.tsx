"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffDialog, StaffEmpty, StaffPage, StaffSearch } from '@/components/staff';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_ORDER, ROLES } from '@/config/roles';
import type { EventVolunteer, VolunteerCandidate, VolunteerRole, VolunteerUser } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** api/locations/ row: only what "Agregar local" needs. */
type LocationRow = { id: number; name: string; referral: { id: number } | null };

const EVENT_FILTER = 'event';
const ALL_FILTER = '';

const fullName = (user: VolunteerUser) => `${user.first_name} ${user.last_name}`.trim() || user.email;

const byName = (a: EventVolunteer, b: EventVolunteer) =>
  fullName(a.user).localeCompare(fullName(b.user), 'es') || a.id - b.id;

/** DRF field errors ({user_id: ['…']}) come back in err.body; useApi only
 *  lifts `detail`/`message` into err.message. */
function errorMessage(err: unknown, fallback: string): string {
  const body = (err as { body?: Record<string, unknown> } | null)?.body;
  if (body) {
    const first = Object.values(body).flat().find((v) => typeof v === 'string');
    if (typeof first === 'string') return first;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function VolunteersPage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading } = useAuth();
  const { setSuccess, setError } = useActionStatus();
  const router = useRouter();

  const [volunteers, setVolunteers] = useState<EventVolunteer[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<VolunteerCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<EventVolunteer | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
  const [cityFilter, setCityFilter] = useState<string>(ALL_FILTER);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  // '' = add as an event volunteer; a location id = as that city's local
  // volunteer (added_by = its referrer).
  const [addTarget, setAddTarget] = useState<string>('');
  const [allTables, setAllTables] = useState<string[]>([]);
  const [editingTablesVolunteer, setEditingTablesVolunteer] = useState<EventVolunteer | null>(null);
  const [draftTables, setDraftTables] = useState<string[]>([]);
  const [customTableInput, setCustomTableInput] = useState('');
  const [savingTables, setSavingTables] = useState(false);

  const { execute: fetchVolunteers } = useApi<EventVolunteer[]>('logistics/volunteers/');
  const { execute: fetchCandidates } = useApi<VolunteerCandidate[]>('logistics/volunteers/candidates/');
  const { execute: createVolunteer } = useApi<EventVolunteer>('logistics/volunteers/', { method: 'POST' });
  const { execute: deleteVolunteer } = useApi<void>('logistics/volunteers/', { method: 'DELETE' });
  const { execute: patchVolunteer } = useApi<EventVolunteer>('logistics/volunteers/', { method: 'PATCH' });
  const { execute: fetchLocations } = useApi<LocationRow[] | { results: LocationRow[] }>('locations/');
  const { execute: fetchEventTables } = useApi<{ all_tables?: string[] }>('logistics/tables/');

  useEffect(() => {
    if (!authIsLoading && (isAuthenticated === false || isAdmin === false)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authIsLoading, router]);

  const loadVolunteers = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await fetchVolunteers();
      setVolunteers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar los voluntarios.'));
    } finally {
      setIsLoadingList(false);
    }
  }, [fetchVolunteers, setError]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadVolunteers();
    }
  }, [isAuthenticated, isAdmin, loadVolunteers]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    let cancelled = false;
    fetchLocations()
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data?.results ?? [];
        setLocations(rows.filter((l) => l.referral));
      })
      .catch(() => {
        // Without locations the admin can still add event volunteers.
      });
    fetchEventTables()
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.all_tables)) {
          setAllTables(data.all_tables);
        }
      })
      .catch(() => {
        // Without tables list, admin can still enter table numbers manually.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAdmin, fetchLocations, fetchEventTables]);

  const cityOptions = useMemo(() => {
    const byId = new Map<number, string>();
    volunteers.forEach((v) => {
      if (v.city) byId.set(v.city.id, v.city.name);
    });
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [volunteers]);

  const shown = volunteers.filter((v) => {
    if (cityFilter === ALL_FILTER) return true;
    if (cityFilter === EVENT_FILTER) return !v.added_by;
    return v.city?.id === Number(cityFilter);
  });

  useEffect(() => {
    const q = query.trim();
    if (!isAdmin || q.length < 2) {
      setCandidates([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await fetchCandidates(undefined, `?q=${encodeURIComponent(q)}`);
        if (!cancelled) setCandidates(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setCandidates([]);
          setError(errorMessage(err, 'No se pudo buscar.'));
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, isAdmin, fetchCandidates, setError]);

  const handleAdd = async (candidate: VolunteerCandidate) => {
    setAddingId(candidate.id);
    try {
      const target = locations.find((l) => String(l.id) === addTarget);
      const body = target?.referral
        ? { user_id: candidate.id, added_by_id: target.referral.id }
        : { user_id: candidate.id };
      const created = await createVolunteer(body);
      if (created) {
        setVolunteers((prev) => [...prev.filter((v) => v.id !== created.id), created].sort(byName));
      }
      setQuery('');
      setCandidates([]);
      setSuccess('Voluntario agregado.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo agregar el voluntario.'));
    } finally {
      setAddingId(null);
    }
  };

  const handleRoleChange = async (volunteer: EventVolunteer, value: string) => {
    setUpdatingRoleId(volunteer.id);
    try {
      const updated = await patchVolunteer({ role: value || null }, `${volunteer.id}/`);
      const role = updated ? updated.role : ((value || null) as VolunteerRole | null);
      setVolunteers((prev) => prev.map((v) => (v.id === volunteer.id ? { ...v, role } : v)));
      setSuccess('Rol actualizado. Se aplica en su app en menos de un minuto.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cambiar el rol.'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const openTablesModal = (volunteer: EventVolunteer) => {
    setEditingTablesVolunteer(volunteer);
    setDraftTables(volunteer.tables ? [...volunteer.tables] : []);
    setCustomTableInput('');
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

  const handleSaveVolunteerTables = async () => {
    if (!editingTablesVolunteer) return;
    setSavingTables(true);
    try {
      const updated = await patchVolunteer(
        { tables: draftTables },
        `${editingTablesVolunteer.id}/`,
      );
      const nextTables = updated?.tables ?? draftTables;
      setVolunteers((prev) =>
        prev.map((v) =>
          v.id === editingTablesVolunteer.id ? { ...v, tables: nextTables } : v,
        ),
      );
      setEditingTablesVolunteer(null);
      setSuccess('Mesas asignadas actualizadas.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron actualizar las mesas.'));
    } finally {
      setSavingTables(false);
    }
  };

  const selectableTables = useMemo(() => {
    const set = new Set<string>(allTables);
    volunteers.forEach((v) => (v.tables ?? []).forEach((t) => set.add(t)));
    draftTables.forEach((t) => set.add(t));
    return [...set].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [allTables, volunteers, draftTables]);

  const handleConfirmRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setIsRemoving(true);
    try {
      await deleteVolunteer(undefined, `${target.id}/`);
      setVolunteers((prev) => prev.filter((v) => v.id !== target.id));
      setCandidates((prev) => prev.map((c) => (c.id === target.user.id ? { ...c, is_volunteer: false } : c)));
      setToRemove(null);
      setSuccess('Voluntario quitado.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo quitar el voluntario.'));
    } finally {
      setIsRemoving(false);
    }
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (isAuthenticated === false || isAdmin === false) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><p>Acceso denegado.</p></div>;
  }

  const showNoResults = !isSearching && query.trim().length >= 2 && candidates.length === 0;

  return (
    <StaffPage>
      <section>
        <h2 className="text-sm font-semibold text-gray-500">Agregar voluntario</h2>
        <select
          value={addTarget}
          onChange={(event) => setAddTarget(event.target.value)}
          className="mt-3 min-h-10 w-full rounded-full border border-gray-200 bg-white px-3 text-sm"
          aria-label="Agregar como"
        >
          <option value="">Del evento</option>
          {locations.map((location) => (
            <option key={location.id} value={String(location.id)}>
              Local de {location.name}
            </option>
          ))}
        </select>
        <StaffSearch
          className="mt-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre, email o usuario"
          aria-label="Buscar usuario para agregar como voluntario"
        />
        {isSearching && <p className="mt-3 text-center text-sm text-gray-500">Buscando...</p>}
        {showNoResults && <StaffEmpty>No hay usuarios que coincidan.</StaffEmpty>}
        {candidates.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3">
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <GameRow
                  title={fullName(candidate)}
                  subtitle={candidate.email}
                  trailing={
                    candidate.is_volunteer ? (
                      <span className="shrink-0 text-sm text-gray-500">Ya es voluntario</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(candidate)}
                        disabled={addingId !== null}
                        className="staff-btn staff-btn-primary !min-h-10 !w-auto shrink-0 !px-4 text-sm"
                        aria-label={`Agregar a ${fullName(candidate)}`}
                      >
                        Agregar
                      </button>
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-500">Voluntarios ({shown.length})</h2>
          <select
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            className="min-h-10 rounded-full border border-gray-200 bg-white px-3 text-xs"
            aria-label="Filtrar por ciudad"
          >
            <option value={ALL_FILTER}>Todos</option>
            <option value={EVENT_FILTER}>Evento</option>
            {cityOptions.map((city) => (
              <option key={city.id} value={String(city.id)}>{city.name}</option>
            ))}
          </select>
        </div>
        {isLoadingList ? (
          <p className="py-8 text-center text-gray-500">Cargando voluntarios...</p>
        ) : shown.length === 0 ? (
          <StaffEmpty>Todavía no hay voluntarios en esta edición.</StaffEmpty>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {shown.map((volunteer) => (
              <li key={volunteer.id}>
                <GameRow
                  title={fullName(volunteer.user)}
                  subtitle={`${volunteer.city?.name ?? 'Evento'}${
                    volunteer.tables && volunteer.tables.length > 0
                      ? ` · Mesas: ${volunteer.tables.join(', ')}`
                      : ''
                  } · ${volunteer.user.email}`}
                  trailing={
                    <div className="flex shrink-0 items-center gap-2">
                      {volunteer.added_by ? (
                        <span className="px-3 text-xs text-gray-500">—</span>
                      ) : (
                        <>
                          {(volunteer.role === 'tables' || (volunteer.tables?.length ?? 0) > 0) && (
                            <button
                              type="button"
                              onClick={() => openTablesModal(volunteer)}
                              className="min-h-10 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700"
                              aria-label={`Mesas de ${fullName(volunteer.user)}`}
                            >
                              {volunteer.tables && volunteer.tables.length > 0
                                ? `Mesas (${volunteer.tables.length})`
                                : 'Asignar mesas'}
                            </button>
                          )}
                          <select
                            value={volunteer.role ?? ''}
                            onChange={(event) => handleRoleChange(volunteer, event.target.value)}
                            disabled={updatingRoleId === volunteer.id}
                            className={`min-h-10 rounded-full border-0 px-3 text-xs font-semibold ${
                              volunteer.role ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-500'
                            }`}
                            aria-label={`Rol de ${fullName(volunteer.user)}`}
                          >
                            <option value="">Sin rol</option>
                            {ROLE_ORDER.map((id) => (
                              <option key={id} value={id}>{ROLES[id].label}</option>
                            ))}
                          </select>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setToRemove(volunteer)}
                        className="staff-btn staff-btn-outline !min-h-10 !w-auto !px-4 text-sm"
                        aria-label={`Quitar a ${fullName(volunteer.user)}`}
                      >
                        Quitar
                      </button>
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <StaffDialog
        open={toRemove !== null}
        variant="danger"
        title={toRemove ? `¿Quitar a ${fullName(toRemove.user)}?` : ''}
        confirmLabel="Sí, quitar"
        confirmDisabled={isRemoving}
        onConfirm={handleConfirmRemove}
        onCancel={() => setToRemove(null)}
      >
        Va a dejar de poder entrar a la app de logística en esta edición.
      </StaffDialog>

      <StaffDialog
        open={editingTablesVolunteer !== null}
        title={editingTablesVolunteer ? `Mesas de ${fullName(editingTablesVolunteer.user)}` : ''}
        confirmLabel={savingTables ? 'Guardando...' : 'Guardar mesas'}
        confirmDisabled={savingTables}
        onConfirm={handleSaveVolunteerTables}
        onCancel={() => {
          if (!savingTables) setEditingTablesVolunteer(null);
        }}
      >
        <p className="text-sm text-gray-600">
          Seleccioná las mesas asignadas a este voluntario:
        </p>
        {selectableTables.length > 0 && (
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
      </StaffDialog>
    </StaffPage>
  );
}
