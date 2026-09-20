"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, PhaseBlocked, StaffEmpty, StaffError, StaffPage, StaffSearch, ThumbCta } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listItems, markItemsReceived } from '@/hooks/boxes/boxApi';
import { matchesSearch, receptorName } from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import type { Item } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function LooseIncomingPage() {
  const { isAuthenticated, isLoading: authIsLoading, userId } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useStaffTitle('Sueltos');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await listItems({ destination: EVENT_LOCATION_ID });
      setItems(all.filter((item) => item.status !== 5 && item.status !== 6));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los juegos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || eventPhase === 0) return;
    load();
  }, [isAuthenticated, eventPhase, load]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      const haystack = [
        String(item.assigned_trade_code),
        item.title,
        receptorName(item),
        item.origin_location_name || '',
      ].join(' ');
      return matchesSearch(haystack, query);
    });
  }, [items, query]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron marcar los juegos.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (eventPhase === 0) {
    return <PhaseBlocked />;
  }

  return (
    <StaffPage className="pb-28">
      <p className="text-sm text-gray-600">
        Buscá por código de etiqueta o por el nombre de quien retira en AMBA. Si el juego venía en una caja, se recibe igual.
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
        <StaffEmpty>No hay pendientes que coincidan.</StaffEmpty>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((item) => {
            const checked = selected.has(item.assigned_trade_code);
            const inBox = item.box_number != null;
            return (
              <li key={item.id}>
                <GameRow
                  title={`${item.assigned_trade_code} · ${item.title}`}
                  subtitle={[
                    receptorName(item) && `Retira ${receptorName(item)}`,
                    item.origin_location_name,
                    inBox && `Caja #${item.box_number}`,
                  ].filter(Boolean).join(' · ')}
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
        onClick={handleReceive}
      >
        Marcar En evento ({selected.size})
      </ThumbCta>
    </StaffPage>
  );
}
