"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { matchesSearch } from '@/hooks/boxes/boxGrouping';
import { listAmbaPending, type AmbaPendingOrigin } from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function AmbaPendingIndexPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [origins, setOrigins] = useState<AmbaPendingOrigin[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrigins(await listAmbaPending());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las pendientes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
  }, [isAuthenticated, load]);

  const visible = useMemo(
    () => origins.filter((origin) => matchesSearch(origin.origin_name, query)),
    [origins, query],
  );

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  return (
    <StaffPage>
      <StaffSearch
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar localidad"
        aria-label="Buscar localidad de origen"
      />
      {isLoading && <LoadingSpinner message="Cargando pendientes..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !error && visible.length === 0 && (
        <StaffEmpty>No hay pendientes AMBA del interior.</StaffEmpty>
      )}
      <ul className="mt-4 flex flex-col gap-3">
        {visible.map((origin) => (
          <li key={origin.origin_id}>
            <GameRow
              href={`/more/tools/amba-pending/${origin.origin_id}`}
              title={origin.origin_name}
              subtitle={`${origin.trades.length} juegos · ${origin.unopened_amba_boxes.length} cajas AMBA · ${origin.transit_boxes.length} tránsito`}
            />
          </li>
        ))}
      </ul>
    </StaffPage>
  );
}
