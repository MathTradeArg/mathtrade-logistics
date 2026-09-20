"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffEmpty, StaffError, StaffPage, StaffSearch, StaffSegmented } from '@/components/staff';
import Link from 'next/link';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listBoxes, listItems } from '@/hooks/boxes/boxApi';
import { groupIncomingByOrigin, matchesSearch } from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Segment = 'amba' | 'transit';

function transitOrigins(items: Item[]) {
  const map = new Map<number, { originId: number; originName: string; itemCount: number }>();
  items.forEach((item) => {
    if (!item.origin_location || item.origin_location === EVENT_LOCATION_ID) return;
    if (!item.location || item.location === EVENT_LOCATION_ID) return;
    const current = map.get(item.origin_location) || {
      originId: item.origin_location,
      originName: item.origin_location_name || `Localidad ${item.origin_location}`,
      itemCount: 0,
    };
    current.itemCount += 1;
    map.set(item.origin_location, current);
  });
  return Array.from(map.values()).sort((a, b) => a.originName.localeCompare(b.originName));
}

export default function BoxesInPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [segment, setSegment] = useState<Segment>('amba');
  const [query, setQuery] = useState('');
  const [ambaBoxes, setAmbaBoxes] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [boxes, packingItems] = await Promise.all([
        listBoxes({ destination: EVENT_LOCATION_ID }),
        listItems({ excludeAmba: EVENT_LOCATION_ID }),
      ]);
      setAmbaBoxes(boxes);
      setItems(packingItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cajas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const ambaOrigins = useMemo(() => {
    const pending = ambaBoxes.filter((box) =>
      box.math_items.some((item) => item.status !== 5 && item.status !== 6),
    );
    return groupIncomingByOrigin(pending).filter((origin) => matchesSearch(origin.originName, query));
  }, [ambaBoxes, query]);

  const transit = useMemo(
    () => transitOrigins(items).filter((origin) => matchesSearch(origin.originName, query)),
    [items, query],
  );

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase || eventPhase === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  return (
    <StaffPage>
      <StaffSegmented
        value={segment}
        onChange={setSegment}
        options={[
          { id: 'amba', label: 'Cajas a AMBA' },
          { id: 'transit', label: 'Siguen de largo' },
        ]}
      />

      <div className="mt-4">
        <StaffSearch
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar localidad"
          aria-label="Buscar localidad de origen"
        />
      </div>

      <Link
        href="/boxes/in/loose"
        className="staff-btn staff-btn-outline mt-4"
      >
        Sueltos / no está en la lista
      </Link>

      {isLoading && <div className="mt-8"><LoadingSpinner message="Cargando localidades..." /></div>}
      {error && <StaffError>{error}</StaffError>}

      {!isLoading && !error && segment === 'amba' && (
        ambaOrigins.length === 0 ? (
          <StaffEmpty>No hay cajas a AMBA pendientes.</StaffEmpty>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {ambaOrigins.map((origin) => (
              <li key={origin.originId}>
                <GameRow
                  href={`/boxes/in/${origin.originId}`}
                  title={origin.originName}
                  subtitle={`${origin.boxCount} cajas · ${origin.pendingCount} pendientes`}
                />
              </li>
            ))}
          </ul>
        )
      )}

      {!isLoading && !error && segment === 'transit' && (
        transit.length === 0 ? (
          <StaffEmpty>No hay cajas que sigan de largo.</StaffEmpty>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {transit.map((origin) => (
              <li key={origin.originId}>
                <GameRow
                  href={`/boxes/in/${origin.originId}?segment=transit`}
                  title={origin.originName}
                  subtitle={`${origin.itemCount} juegos en tránsito`}
                />
              </li>
            ))}
          </ul>
        )
      )}
    </StaffPage>
  );
}
