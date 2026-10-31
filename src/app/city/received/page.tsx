"use client";

import { LoadingSpinner } from '@/components/common/ui';
import NoCity from '@/components/city/NoCity';
import ReadOnlyBadge from '@/components/city/ReadOnlyBadge';
import ReferrerOnly from '@/components/city/ReferrerOnly';
import { apiErrorMessage } from '@/components/city/errors';
import { GameRow, StaffEmpty, StaffError, StaffPage, StaffSegmented } from '@/components/staff';
import { useCityView } from '@/contexts/CityViewContext';
import { listItems } from '@/hooks/boxes/boxApi';
import { boxLabel } from '@/hooks/boxes/boxGrouping';
import { listTrackings } from '@/hooks/city/cityApi';
import type { Item, Tracking } from '@/types';
import { formatMoney, formatTradeCode, pricePerItem } from '@/utils/tradeCode';
import { useEffect, useMemo, useState } from 'react';

type Tab = 'boxes' | 'items';

const TABS: { id: Tab; label: string }[] = [
  { id: 'boxes', label: 'Cajas' },
  { id: 'items', label: 'Ejemplares' },
];

const receiverName = (item: Item) =>
  `${item.receptor_first_name || '—'} ${item.receptor_last_name || ''}`.trim();

function TrackingCard({ tracking }: { tracking: Tracking }) {
  const [open, setOpen] = useState(false);
  const origin = tracking.boxes.find((box) => box.origin_name)?.origin_name || '—';
  const count = tracking.item_count;
  return (
    <li className="staff-card p-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <p className="text-base font-semibold text-gray-900">{origin} · {tracking.tracking_code}</p>
        <p className="text-sm text-gray-700">
          Cajas: {tracking.boxes.map(boxLabel).join(', ') || '—'} · {count} juegos
        </p>
        <p className="text-sm text-gray-700">
          {formatMoney(tracking.price)} en total ·{' '}
          {pricePerItem(tracking.price, count)} por juego
        </p>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-stroke pt-3">
          {tracking.boxes.map((box) => (
            <div key={box.id}>
              <p className="text-sm font-semibold text-gray-900">Caja {boxLabel(box)}</p>
              {box.comment && <p className="text-sm text-gray-600">{box.comment}</p>}
              <ul className="mt-1 text-sm text-gray-700">
                {box.math_items.map((item) => (
                  <li key={item.id}>
                    {formatTradeCode(item.assigned_trade_code)} · {item.title} → {receiverName(item)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/** Recibidas: what other cities ship to this one. Read-only; the referrer
 *  (and the admin, as a referrer) only. */
export default function CityReceivedPage() {
  const { cityId, kind, params } = useCityView();
  const asLocation = params.as_location;
  const mathtrade = params.mathtrade;
  const isReferrer = kind === 'referrer';
  const [tab, setTab] = useState<Tab>('boxes');
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [originFilter, setOriginFilter] = useState('');
  const [viaMeeting, setViaMeeting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cityId === null || !isReferrer) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const view = { as_location: asLocation, mathtrade };
    const load =
      tab === 'boxes'
        ? listTrackings({ destination: cityId, ...view }).then((rows) => !cancelled && setTrackings(rows))
        : listItems({ destination: cityId, ...view }).then((rows) => !cancelled && setItems(rows));
    load
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar las recibidas.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, isReferrer, tab, asLocation, mathtrade]);

  const origins = useMemo(() => {
    const byId = new Map<number, string>();
    items.forEach((item) => {
      if (item.origin_location != null) byId.set(item.origin_location, item.origin_location_name ?? `${item.origin_location}`);
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((item) =>
      (!originFilter || `${item.origin_location}` === originFilter) && (!viaMeeting || item.via_meeting)),
    [items, originFilter, viaMeeting],
  );

  if (cityId === null) return <NoCity />;
  if (!isReferrer) return <ReferrerOnly message="Solo el referente de la ciudad ve lo que recibe." />;

  return (
    <StaffPage>
      <ReadOnlyBadge />
      <StaffSegmented value={tab} options={TABS} onChange={setTab} />
      {isLoading && <LoadingSpinner message="Cargando..." />}
      {error && <StaffError>{error}</StaffError>}

      {tab === 'boxes' && (
        <>
          {!isLoading && !error && trackings.length === 0 && (
            <StaffEmpty>Todavía no hay envíos hacia tu ciudad.</StaffEmpty>
          )}
          {trackings.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {trackings.map((tracking) => (
                <TrackingCard key={tracking.id} tracking={tracking} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'items' && (
        <>
          <div className="mt-4 flex flex-col gap-3">
            <select
              aria-label="Origen"
              value={originFilter}
              onChange={(event) => setOriginFilter(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-stroke bg-white px-3 text-base text-gray-900"
            >
              <option value="">Todos los orígenes</option>
              {origins.map((origin) => (
                <option key={origin.id} value={origin.id}>
                  {origin.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={viaMeeting}
                onChange={(event) => setViaMeeting(event.target.checked)}
                className="h-5 w-5"
              />
              Solo los que pasan por el encuentro
            </label>
          </div>
          {!isLoading && !error && visibleItems.length === 0 && (
            <StaffEmpty>{items.length === 0 ? 'Todavía no hay ejemplares hacia tu ciudad.' : 'Sin resultados.'}</StaffEmpty>
          )}
          {visibleItems.length > 0 && (
            <>
              <p className="mt-4 text-sm text-gray-500">{visibleItems.length} ejemplares</p>
              <ul className="mt-3 flex flex-col gap-3">
                {visibleItems.map((item) => (
                  <li key={item.id}>
                    <GameRow
                      title={`${formatTradeCode(item.assigned_trade_code)} · ${item.title}`}
                      subtitle={`${receiverName(item)} · de ${item.origin_location_name ?? '—'}${
                        item.via_meeting && cityId !== 1 ? ' (AMBA)' : ''
                      } · Caja ${item.box_number ?? '—'}`}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </StaffPage>
  );
}
