"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffDialog, StaffEmpty, StaffError, StaffPage, StaffSearch, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listItems, markItemsReceived } from '@/hooks/boxes/boxApi';
import { isPendingIncomingItem, matchesSearch, receptorName } from '@/hooks/boxes/boxGrouping';
import { formatTradeCode, tradeCodeSearchText } from '@/utils/tradeCode';
import { useAuth } from '@/hooks/useAuth';
import type { Item } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

const OTHER_CITIES_FAILED = 'No se pudo buscar en el resto de las ciudades.';

/** Where a loose game goes after the event: another city ("Sigue a Rosario"),
 *  or the special table when its locality ships as AMBA (La Plata). */
function itemSubtitle(item: Item): string {
  const receptor = receptorName(item);
  const destination = item.send_to ?? item.location;
  const otherCity = destination != null && destination !== EVENT_LOCATION_ID;
  const specialTable = !otherCity && item.location != null && item.location !== EVENT_LOCATION_ID;
  const cityName = item.send_to_name ?? item.location_name;
  return [
    otherCity && cityName && `Sigue a ${cityName}`,
    specialTable && 'Retira en mesa especial',
    receptor && (specialTable ? receptor : `Retira ${receptor}`),
    item.origin_location_name,
    item.box_number != null && `Caja #${item.box_number}`,
  ].filter(Boolean).join(' · ');
}

export default function LooseIncomingPage() {
  const { isAuthenticated, isLoading: authIsLoading, userId } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  // Games bound to other cities, only fetched when nothing bound to AMBA matches.
  const [extraItems, setExtraItems] = useState<Item[]>([]);
  const [extraLoaded, setExtraLoaded] = useState(false);
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraFailedQuery, setExtraFailedQuery] = useState<string | null>(null);

  useStaffTitle('Sueltos');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await listItems({ destination: EVENT_LOCATION_ID });
      setItems(all.filter(isPendingIncomingItem));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los juegos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExtra = useCallback(async () => {
    const others = await listItems({ excludeAmba: EVENT_LOCATION_ID, excludeDelivered: true });
    setExtraItems(others.filter(isPendingIncomingItem));
    setExtraLoaded(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const allItems = useMemo(() => {
    const ids = new Set(items.map((item) => item.id));
    return [...items, ...extraItems.filter((item) => !ids.has(item.id))];
  }, [items, extraItems]);

  const visible = useMemo(() => {
    return allItems.filter((item) => {
      const haystack = [
        tradeCodeSearchText(item.assigned_trade_code),
        item.title,
        receptorName(item),
        item.origin_location_name || '',
      ].join(' ');
      return matchesSearch(haystack, query);
    });
  }, [allItems, query]);

  useEffect(() => {
    if (isLoading || query.trim().length < 2 || visible.length > 0) return;
    if (extraLoaded || extraLoading || extraFailedQuery === query) return;
    setExtraLoading(true);
    loadExtra()
      .then(() => setExtraFailedQuery(null))
      .catch(() => setExtraFailedQuery(query))
      .finally(() => setExtraLoading(false));
  }, [isLoading, query, visible.length, extraLoaded, extraLoading, extraFailedQuery, loadExtra]);

  const toggle = (code: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleReceive = async () => {
    if (selected.size === 0 || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await markItemsReceived(Array.from(selected), userId);
      await load();
      if (extraLoaded) await loadExtra();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron marcar los juegos.');
    } finally {
      setIsSaving(false);
      setShowConfirm(false);
    }
  };

  // Every selected game, also the ones the current search hides.
  const selectedItems = allItems.filter((item) => selected.has(item.assigned_trade_code));

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  return (
    <StaffPage className="pb-28">
      <p className="text-body text-gray-600">
        Buscá por código de etiqueta o por el nombre de quien retira en AMBA. Si el juego venía en una caja, se recibe igual. Si no aparece, se busca también en los juegos que siguen a otras ciudades.
      </p>

      <div className="mt-4">
        <StaffSearch
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Código o nombre del destinatario"
          aria-label="Buscar sueltos"
        />
      </div>

      {isLoading && <div className="mt-8"><LoadingSpinner message="Cargando juegos..." /></div>}
      {error && <StaffError>{error}</StaffError>}

      {!isLoading && !error && (query.trim().length < 2 ? (
        <StaffEmpty>Escribí al menos 2 caracteres para buscar.</StaffEmpty>
      ) : visible.length === 0 ? (
        extraLoading ? (
          <div className="mt-8"><LoadingSpinner message="Buscando en el resto de las ciudades..." /></div>
        ) : (
          <>
            {extraFailedQuery === query && <StaffError>{OTHER_CITIES_FAILED}</StaffError>}
            <StaffEmpty>No hay pendientes que coincidan.</StaffEmpty>
          </>
        )
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((item) => {
            const checked = selected.has(item.assigned_trade_code);
            return (
              <li key={item.id}>
                <GameRow
                  title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                  subtitle={itemSubtitle(item)}
                  onClick={() => toggle(item.assigned_trade_code)}
                  selected={checked}
                />
              </li>
            );
          })}
        </ul>
      ))}

      <ThumbCta
        variant="success"
        disabled={selected.size === 0 || isSaving}
        onClick={() => setShowConfirm(true)}
      >
        Marcar En evento ({selected.size})
      </ThumbCta>

      <StaffDialog
        open={showConfirm}
        title="Marcar en evento"
        confirmLabel={`Confirmar (${selected.size})`}
        confirmDisabled={isSaving}
        onConfirm={handleReceive}
        onCancel={() => setShowConfirm(false)}
      >
        <p>Vas a marcar {selected.size} {selected.size === 1 ? 'juego' : 'juegos'} como En evento:</p>
        <ul className="mt-2 flex flex-col gap-1 font-semibold text-gray-900">
          {selectedItems.map((item) => (
            <li key={item.id}>{`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}</li>
          ))}
        </ul>
        <p className="mt-3">Si alguno no llegó físicamente, no lo marques: solo un organizador puede deshacerlo.</p>
      </StaffDialog>
    </StaffPage>
  );
}
