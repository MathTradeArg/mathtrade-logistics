"use client";

import FullScreenImageModal from '@/components/common/FullScreenImageModal';
import { LoadingSpinner } from '@/components/common/ui';
import NoCity from '@/components/city/NoCity';
import ReadOnlyBadge from '@/components/city/ReadOnlyBadge';
import TrackingSummary from '@/components/city/TrackingSummary';
import { apiErrorMessage } from '@/components/city/errors';
import { GameRow, StaffEmpty, StaffError, StaffPage, StaffSearch, StaffSegmented, ThumbCta } from '@/components/staff';
import { useCityView } from '@/contexts/CityViewContext';
import { listItems } from '@/hooks/boxes/boxApi';
import { matchesSearch } from '@/hooks/boxes/boxGrouping';
import { listTrackings } from '@/hooks/city/cityApi';
import type { Item, Tracking } from '@/types';
import { fileSlug, downloadSheet } from '@/utils/xlsx';
import { formatTradeCode, itemBoxLabel } from '@/utils/tradeCode';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Tab = 'shipments' | 'items';

const TABS: { id: Tab; label: string }[] = [
  { id: 'shipments', label: 'Envíos' },
  { id: 'items', label: 'Ejemplares' },
];

const giverName = (item: Item) => `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || '—';

export default function CityShipmentsPage() {
  const { cityId, cityName, kind, params, readOnly } = useCityView();
  const router = useRouter();
  const isReferrer = kind === 'referrer';
  const asLocation = params.as_location;
  const mathtrade = params.mathtrade;
  const [tab, setTab] = useState<Tab>('shipments');
  // A local volunteer only sees the Ejemplares of the city.
  const activeTab: Tab = isReferrer ? tab : 'items';

  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (cityId === null) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const view = { as_location: asLocation, mathtrade };
    const load =
      activeTab === 'shipments'
        ? listTrackings(view).then((rows) => !cancelled && setTrackings(rows))
        : // Games that stay in the city are delivered by their giver, not shipped.
          listItems({ origin: cityId, ...view }).then(
            (rows) => !cancelled && setItems(rows.filter((item) => item.location !== cityId)),
          );
    load
      .catch((err) => {
        if (!cancelled) {
          setError(apiErrorMessage(err, activeTab === 'shipments'
            ? 'No se pudieron cargar los envíos.'
            : 'No se pudieron cargar los ejemplares.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, activeTab, asLocation, mathtrade]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesSearch(
      `${formatTradeCode(item.assigned_trade_code)} ${giverName(item)} ${item.title} ${item.location_name ?? ''}`,
      query,
    )),
    [items, query],
  );

  if (cityId === null) return <NoCity />;

  const handleDownload = () => {
    downloadSheet(
      visibleItems.map((item) => ({
        'Código': formatTradeCode(item.assigned_trade_code),
        'Entregador': giverName(item),
        'Juego': item.title,
        'Caja': itemBoxLabel(item),
        'Destino': item.location_name ?? '',
      })),
      `ejemplares_${fileSlug(cityName)}.xlsx`,
      'Ejemplares',
    ).catch(() => setError('No se pudo generar el Excel.'));
  };

  return (
    <StaffPage className="pb-28">
      <ReadOnlyBadge />
      {isReferrer && <StaffSegmented value={activeTab} options={TABS} onChange={setTab} />}
      {isLoading && <LoadingSpinner message={activeTab === 'shipments' ? 'Cargando envíos...' : 'Cargando ejemplares...'} />}
      {error && <StaffError>{error}</StaffError>}

      {activeTab === 'shipments' && (
        <>
          {!isLoading && !error && trackings.length === 0 && (
            <StaffEmpty>Todavía no cargaste envíos.</StaffEmpty>
          )}
          {trackings.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {trackings.map((tracking) => (
                <li key={tracking.id} className="staff-card p-4">
                  <TrackingSummary tracking={tracking} onOpenImage={setImageUrl} />
                  <Link
                    href={`/city/shipments/${tracking.id}`}
                    className="staff-btn staff-btn-outline mt-3"
                  >
                    Ver envío
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!readOnly && <ThumbCta onClick={() => router.push('/city/shipments/new')}>Nuevo envío</ThumbCta>}
        </>
      )}

      {activeTab === 'items' && (
        <>
          <StaffSearch
            className="mt-4"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar código, entregador o juego"
            aria-label="Buscar ejemplares"
          />
          {!isLoading && !error && visibleItems.length === 0 && (
            <StaffEmpty>{items.length === 0 ? 'No hay ejemplares para enviar.' : 'Sin resultados.'}</StaffEmpty>
          )}
          {visibleItems.length > 0 && (
            <>
              <p className="mt-4 text-sm text-gray-500">{visibleItems.length} ejemplares</p>
              <ul className="mt-3 flex flex-col gap-3">
                {visibleItems.map((item) => (
                  <li key={item.id}>
                    <GameRow
                      title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                      subtitle={`${giverName(item)} · Caja ${itemBoxLabel(item)} · ${item.location_name ?? '—'}`}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          <ThumbCta onClick={handleDownload} disabled={visibleItems.length === 0}>
            Descargar Excel
          </ThumbCta>
        </>
      )}
      <FullScreenImageModal imageUrl={imageUrl} onClose={() => setImageUrl(null)} />
    </StaffPage>
  );
}
