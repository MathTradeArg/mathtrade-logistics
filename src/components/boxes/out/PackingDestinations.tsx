"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listBoxes, listItems, type CityViewParams } from '@/hooks/boxes/boxApi';
import {
  boxDestinationLabel,
  destinationLabel,
  findBoxForTrade,
  goesViaHub,
  groupPackingDestinations,
  isBoxOpen,
  isIntraLocality,
  matchesSearch,
  packingDestinationId,
  receptorName,
  splitByRoute,
} from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import { buildBoxesExport, buildIntraExport } from '@/utils/boxesExport';
import { formatTradeCode, tradeCodeSearchText } from '@/utils/tradeCode';
import { downloadWorkbook, type WorkbookSheet } from '@/utils/xlsx';
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
  /** Admin "Ver como" params for the box list (city screens). */
  viewParams?: CityViewParams;
  /** When set, shows an "Excel de cajas" button that saves the loaded games
   *  bound for other cities under this file name. */
  exportFileName?: string;
  /** When set, shows an "Excel intralocalidad" button that saves the loaded
   *  games that stay in the city under this file name. */
  intraExportFileName?: string;
};

/** Destinations to pack for, from `origin`. */
export default function PackingDestinations({
  origin, basePath, phaseGated, loadItems, excludeDestination, viewParams, exportFileName, intraExportFileName,
}: PackingDestinationsProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [handedOverAtHub, setHandedOverAtHub] = useState<ReadonlySet<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The caller passes a new function each render; only the latest is used.
  const loadItemsRef = useRef(loadItems);
  loadItemsRef.current = loadItems;
  const blocked = phaseGated && eventPhase === 0;
  // Primitive deps: callers pass a fresh params object each render.
  const asLocation = viewParams?.as_location;
  const mathtrade = viewParams?.mathtrade;
  const requirePackableStatus = phaseGated;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const needsHubGivers = requirePackableStatus && origin === EVENT_LOCATION_ID;
      const [nextItems, nextBoxes, hubGiven] = await Promise.all([
        loadItemsRef.current(),
        listBoxes({ origin, as_location: asLocation, mathtrade }),
        needsHubGivers
          ? listItems({ origin: EVENT_LOCATION_ID, excludeAmba: EVENT_LOCATION_ID })
          : Promise.resolve([] as Item[]),
      ]);
      setHandedOverAtHub(new Set(hubGiven.map((item) => item.id)));
      setAllItems(nextItems);
      setItems(nextItems.filter((item) => item.location !== excludeDestination));
      setBoxes(nextBoxes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los destinos.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, excludeDestination, asLocation, mathtrade, requirePackableStatus]);

  useEffect(() => {
    if (!isAuthenticated || blocked) return;
    load();
  }, [isAuthenticated, blocked, load]);

  const destinations = useMemo(
    () => groupPackingDestinations(items, boxes, requirePackableStatus, origin, handedOverAtHub)
      .filter((dest) => dest.destinationId !== excludeDestination)
      .map((dest) => ({ ...dest, label: destinationLabel(dest.destinationName, dest.viaHub) })),
    [items, boxes, requirePackableStatus, excludeDestination, origin, handedOverAtHub],
  );

  const exportItems = useMemo(
    () => allItems.filter((item) => !isIntraLocality(item, origin)),
    [allItems, origin],
  );

  const intraItems = useMemo(
    () => allItems.filter((item) => isIntraLocality(item, origin)),
    [allItems, origin],
  );

  const runExport = async (build: () => WorkbookSheet[], fileName: string) => {
    try {
      await downloadWorkbook(build(), fileName);
    } catch {
      setError('No se pudo generar el Excel.');
    }
  };

  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      if (matchesSearch(dest.label, query)) return true;
      return items.some((item) => {
        if (packingDestinationId(item, origin) !== dest.destinationId) return false;
        return matchesSearch(
          [item.title, tradeCodeSearchText(item.assigned_trade_code), receptorName(item), item.location_name ?? ''].join(' '),
          query,
        );
      });
    });
  }, [destinations, items, query, origin]);

  // From a city, the boxes to AMBA (staying there or travelling on) are listed
  // apart from the ones that go straight to another city.
  const sections = useMemo(() => {
    if (origin === EVENT_LOCATION_ID) {
      return [{ key: 'all', title: null as string | null, entries: filteredDestinations }];
    }
    return splitByRoute(filteredDestinations, (dest) => dest.destinationId, (dest) => dest.viaHub);
  }, [origin, filteredDestinations]);

  const itemHits = useMemo(() => {
    if (query.trim().length < 2) return [];
    return items.filter((item) =>
      matchesSearch(
        [item.title, tradeCodeSearchText(item.assigned_trade_code), receptorName(item), item.location_name ?? ''].join(' '),
        query,
      ),
    ).slice(0, 8);
  }, [items, query]);

  const handleItemHit = (item: Item) => {
    const box = findBoxForTrade(boxes, item.id);
    if (box && isBoxOpen(box)) {
      const destId = packingDestinationId(item, origin) ?? box.destiny;
      router.push(`${basePath}/${destId}/${box.id}`);
      return;
    }
    if (box && !isBoxOpen(box)) {
      const tag = origin === EVENT_LOCATION_ID && box.origin_number != null
        ? `${box.origin_number}-${box.number}`
        : `#${box.number}`;
      setError(`Ese juego ya está en la caja ${tag} (cerrada).`);
      return;
    }
    const destId = packingDestinationId(item, origin);
    if (destId) {
      router.push(`${basePath}/${destId}`);
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

      {(exportFileName || intraExportFileName) && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row" role="group" aria-label="Descargas en Excel">
          {exportFileName && (
            <button
              type="button"
              className="staff-btn staff-btn-outline !min-h-12 text-sm"
              disabled={isLoading || exportItems.length === 0}
              onClick={() => runExport(() => buildBoxesExport(exportItems, origin), exportFileName)}
            >
              Excel de cajas
            </button>
          )}
          {intraExportFileName && (
            <button
              type="button"
              className="staff-btn staff-btn-outline !min-h-12 text-sm"
              disabled={isLoading || intraItems.length === 0}
              onClick={() => runExport(() => buildIntraExport(intraItems, origin), intraExportFileName)}
            >
              Excel intralocalidad
            </button>
          )}
        </div>
      )}

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
                  ? `En caja abierta a ${boxDestinationLabel(box)}`
                  : `En caja ${
                      origin === EVENT_LOCATION_ID && box.origin_number != null
                        ? `${box.origin_number}-${box.number}`
                        : `#${box.number}`
                    } (cerrada)`
                : item.location_name
                  ? `Listo para ${destinationLabel(item.location_name, goesViaHub(origin, item.location, item.via_meeting))}`
                  : 'Listo para empacar';
              return (
                <li key={item.id}>
                  <GameRow
                    title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
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
        sections.map((section) => (
          <section key={section.key} aria-label={section.title ?? undefined}>
            {section.title && (
              <h2 className="mt-6 text-sm font-semibold text-gray-500">{section.title}</h2>
            )}
            <ul className={`${section.title ? 'mt-3' : 'mt-4'} flex flex-col gap-3`}>
              {section.entries.map((dest) => (
                <li key={dest.destinationId}>
                  <GameRow
                    href={`${basePath}/${dest.destinationId}`}
                    title={dest.label}
                    subtitle={`${dest.readyCount} listos · ${dest.inOpenCount} en cajas abiertas · ${dest.closedBoxCount} cerradas`}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </StaffPage>
  );
}
