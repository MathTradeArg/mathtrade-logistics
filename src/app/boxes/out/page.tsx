"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { EVENT_LOCATION_ID } from '@/constants/event';
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
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function BoxesOutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextItems, nextBoxes] = await Promise.all([
        listItems({ excludeAmba: EVENT_LOCATION_ID }),
        listBoxes(),
      ]);
      setItems(nextItems);
      setBoxes(nextBoxes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los destinos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const destinations = useMemo(
    () => groupPackingDestinations(items, boxes).filter((dest) => dest.destinationId !== EVENT_LOCATION_ID),
    [items, boxes],
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
      router.push(`/boxes/out/${box.destiny}/${box.id}`);
      return;
    }
    if (box && !isBoxOpen(box)) {
      setError(`Ese juego ya está en la caja #${box.number} (cerrada).`);
      return;
    }
    if (item.location) {
      router.push(`/boxes/out/${item.location}`);
    }
  };

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase || eventPhase === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
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
                href={`/boxes/out/${dest.destinationId}`}
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
