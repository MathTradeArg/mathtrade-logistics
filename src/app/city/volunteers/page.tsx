"use client";

import NoCity from '@/components/city/NoCity';
import ReferrerOnly from '@/components/city/ReferrerOnly';
import { apiErrorMessage } from '@/components/city/errors';
import { GameRow, StaffDialog, StaffEmpty, StaffPage, StaffSearch } from '@/components/staff';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useCityView } from '@/contexts/CityViewContext';
import type { CityVolunteer, CityVolunteerCandidate, VolunteerUser } from '@/types';
import { whatsappLink } from '@/utils/whatsapp';
import { useCallback, useEffect, useState } from 'react';

const ENDPOINT = 'logistics/city-volunteers/';

const fullName = (user: Pick<VolunteerUser, 'first_name' | 'last_name' | 'email'>) =>
  `${user.first_name} ${user.last_name}`.trim() || user.email;

const byName = (a: CityVolunteer, b: CityVolunteer) =>
  fullName(a.user).localeCompare(fullName(b.user), 'es') || a.id - b.id;

/** Más › Voluntarios for a referrer: the local volunteers of their city
 *  (active-edition members of the city who may build its boxes). */
export default function CityVolunteersPage() {
  const { cityId, cityName, kind, readOnly, params } = useCityView();
  const { setSuccess, setError } = useActionStatus();
  const isReferrer = kind === 'referrer';
  const asLocation = params.as_location;

  const [volunteers, setVolunteers] = useState<CityVolunteer[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<CityVolunteerCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<CityVolunteer | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const { execute: fetchVolunteers } = useApi<CityVolunteer[]>(ENDPOINT);
  const { execute: fetchCandidates } = useApi<CityVolunteerCandidate[]>(`${ENDPOINT}candidates/`);
  const { execute: createVolunteer } = useApi<CityVolunteer>(ENDPOINT, { method: 'POST' });
  const { execute: deleteVolunteer } = useApi<void>(ENDPOINT, { method: 'DELETE' });

  const loadVolunteers = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await fetchVolunteers(undefined, asLocation ? `?as_location=${asLocation}` : undefined);
      setVolunteers(Array.isArray(data) ? [...data].sort(byName) : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron cargar los voluntarios.'));
    } finally {
      setIsLoadingList(false);
    }
  }, [fetchVolunteers, setError, asLocation]);

  useEffect(() => {
    if (isReferrer) loadVolunteers();
  }, [isReferrer, loadVolunteers]);

  useEffect(() => {
    const q = query.trim();
    if (!isReferrer || readOnly || q.length < 2) {
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
          setError(apiErrorMessage(err, 'No se pudo buscar.'));
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, isReferrer, readOnly, fetchCandidates, setError]);

  const handleAdd = async (candidate: CityVolunteerCandidate) => {
    setAddingId(candidate.id);
    try {
      const created = await createVolunteer({ user_id: candidate.id });
      if (created) {
        setVolunteers((prev) => [...prev.filter((v) => v.id !== created.id), created].sort(byName));
      }
      setQuery('');
      setCandidates([]);
      setSuccess('Voluntario agregado.');
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo agregar el voluntario.'));
    } finally {
      setAddingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setIsRemoving(true);
    try {
      await deleteVolunteer(undefined, `${target.id}/`);
      setVolunteers((prev) => prev.filter((v) => v.id !== target.id));
      setToRemove(null);
      setSuccess('Voluntario quitado.');
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo quitar el voluntario.'));
    } finally {
      setIsRemoving(false);
    }
  };

  if (cityId === null) return <NoCity />;
  if (!isReferrer) return <ReferrerOnly message="Solo el referente de la ciudad maneja sus voluntarios." />;

  const showNoResults = !isSearching && query.trim().length >= 2 && candidates.length === 0;

  return (
    <StaffPage>
      <p className="text-sm text-gray-600">
        Pueden armar cajas de {cityName} y ver el teléfono y Telegram de sus participantes.
      </p>

      {!readOnly && (
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500">Agregar voluntario</h2>
        <StaffSearch
          className="mt-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Participante de ${cityName}`}
          aria-label="Buscar participante para agregar como voluntario"
        />
        {isSearching && <p className="mt-3 text-center text-sm text-gray-500">Buscando...</p>}
        {showNoResults && <StaffEmpty>No hay participantes de tu ciudad que coincidan.</StaffEmpty>}
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
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-gray-500">Voluntarios ({volunteers.length})</h2>
        {isLoadingList ? (
          <p className="py-8 text-center text-gray-500">Cargando voluntarios...</p>
        ) : volunteers.length === 0 ? (
          <StaffEmpty>Todavía no agregaste voluntarios.</StaffEmpty>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {volunteers.map((volunteer) => {
              const wa = whatsappLink(volunteer.user.phone);
              const telegram = volunteer.user.telegram?.replace(/^@/, '');
              return (
                <li key={volunteer.id}>
                  <GameRow
                    title={fullName(volunteer.user)}
                    subtitle={volunteer.user.phone || volunteer.user.email}
                    trailing={
                      <div className="flex shrink-0 items-center gap-2">
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer"
                             className="text-sm font-semibold text-primary">WhatsApp</a>
                        )}
                        {telegram && (
                          <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer"
                             className="text-sm font-semibold text-primary">Telegram</a>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setToRemove(volunteer)}
                            className="staff-btn staff-btn-outline !min-h-10 !w-auto !px-4 text-sm"
                            aria-label={`Quitar a ${fullName(volunteer.user)}`}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    }
                  />
                </li>
              );
            })}
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
        Va a dejar de poder armar las cajas de {cityName}.
      </StaffDialog>
    </StaffPage>
  );
}
