"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listBoxes, listItems } from '@/hooks/boxes/boxApi';
import {
  findBoxForTrade,
  groupPackingDestinations,
  isBoxOpen,
  matchesSearch,
  receptorName,
} from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type PackingDestinationsProps = {
  /** Where the boxes leave from: the hub at the event, the city elsewhere. */
  origin: number;
  /** Route prefix of the destination/box screens (`/boxes/out`, `/city/boxes`). */
  basePath: string;
  /** Blocked while the event hasn't started (the event screens only). */
  phaseGated: boolean;
  loadItems: () => Promise<Item[]>;
  /** Never offered as a destination (the hub itself, or the city's local games). */
  excludeDestination: number;
};

/** Destinations to pack for, from `origin`. */
export default function PackingDestinations({
  origin, basePath, phaseGated, loadItems, excludeDestination,
}: PackingDestinationsProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The caller passes a new function each render; only the latest is used.
  const loadItemsRef = useRef(loadItems);
  loadItemsRef.current = loadItems;
  const blocked = phaseGated && eventPhase === 0;
  const requirePackableStatus = phaseGated;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextItems, nextBoxes] = await Promise.all([
        loadItemsRef.current(),
        listBoxes({ origin }),
      ]);
      setItems(nextItems.filter((item) => item.location !== excludeDestination));
      setBoxes(nextBoxes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los destinos.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, excludeDestination]);

  useEffect(() => {
    if (!isAuthenticated || blocked) return;
    load();
  }, [isAuthenticated, blocked, load]);

  const destinations = useMemo(
    () => groupPackingDestinations(items, boxes, requirePackableStatus)
      .filter((dest) => dest.destinationId !== excludeDestination),
    [items, boxes, requirePackableStatus, excludeDestination],
  );

  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      if (matchesSearch(dest.destinationName, query)) return true;
      return items.some((item) => {
        if (item.location !== dest.destinationId) return false;
        return matchesSearch(
          [item.title, String(item.assigned_trade_code), receptorName(item)].join(' '),
          query,
        );
      });
    });
  }, [destinations, items, query]);

  const itemHits = useMemo(() => {
    if (query.trim().length < 2) return [];
    return items.filter((item) =>
      matchesSearch(
        [item.title, String(item.assigned_trade_code), receptorName(item)].join(' '),
        query,
      ),
    ).slice(0, 8);
  }, [items, query]);

  const handleItemHit = (item: Item) => {
    const box = findBoxForTrade(boxes, item.id);
    if (box && isBoxOpen(box)) {
      router.push(`${basePath}/${box.destiny}/${box.id}`);
      return;
    }
    if (box && !isBoxOpen(box)) {
      setError(`Ese juego ya está en la caja #${box.number} (cerrada).`);
      return;
    }
    if (item.location) {
      router.push(`${basePath}/${item.location}`);
    }
  };

  if (authIsLoading || isAuthenticated === null || (phaseGated && (isLoadingEventPhase || eventPhase === null))) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (blocked) {
    return <PhaseBlocked />;
  }

  return (
    <StaffPage>
      <StaffSearch
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar destino, juego o etiqueta"
        aria-label="Buscar destinos o juegos"
      />

      {isLoading && <div className="mt-8"><LoadingSpinner message="Cargando destinos..." /></div>}
      {error && <StaffError>{error}</StaffError>}

      {!isLoading && itemHits.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Juegos</h2>
          <ul className="flex flex-col gap-3">
            {itemHits.map((item) => {
              const box = findBoxForTrade(boxes, item.id);
              const subtitle = box
                ? isBoxOpen(box)
                  ? `En caja abierta a ${box.destination_name}`
                  : `En caja #${box.number} (cerrada)`
                : `Listo para ${item.location_name || 'empacar'}`;
              return (
                <li key={item.id}>
                  <GameRow
                    title={`${item.assigned_trade_code} · ${item.title}`}
                    subtitle={subtitle}
                    onClick={() => handleItemHit(item)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!isLoading && !error && filteredDestinations.length === 0 ? (
        <StaffEmpty>No hay destinos para empacar.</StaffEmpty>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filteredDestinations.map((dest) => (
            <li key={dest.destinationId}>
              <GameRow
                href={`${basePath}/${dest.destinationId}`}
                title={dest.destinationName}
                subtitle={`${dest.readyCount} listos · ${dest.inOpenCount} en cajas abiertas · ${dest.closedBoxCount} cerradas`}
              />
            </li>
          ))}
        </ul>
      )}
    </StaffPage>
  );
}
