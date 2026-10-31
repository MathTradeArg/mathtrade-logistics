"use client";

import { useCityView } from '@/contexts/CityViewContext';

const selectClass =
  'min-h-12 w-full rounded-xl border border-stroke bg-white px-3 text-base text-gray-900 focus:border-primary focus:outline-none';

/** Admins only: see /city as any city's referrer, in any edition. Anything
 *  other than the admin's own city in the active edition is read-only. */
export default function CityViewSelector() {
  const {
    isAdmin, asLocation, cityId, mathtradeId, locations, mathtrades, readOnly,
    setAsLocation, setMathtrade,
  } = useCityView();
  if (!isAdmin) return null;

  return (
    <section className="staff-panel mb-6 flex flex-col gap-3 p-4" aria-label="Ver como">
      <label className="flex flex-col gap-1 text-sm font-semibold text-gray-600">
        Ver como
        <select
          className={selectClass}
          value={asLocation ?? cityId ?? ''}
          onChange={(event) => setAsLocation(Number(event.target.value) || null)}
        >
          <option value="">Elegí una ciudad</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-gray-600">
        Edición
        <select
          className={selectClass}
          value={mathtradeId ?? ''}
          onChange={(event) => setMathtrade(Number(event.target.value) || null)}
        >
          {mathtrades.map((mt) => (
            <option key={mt.id} value={mt.id}>
              {mt.name}
              {mt.active ? ' (en curso)' : ''}
            </option>
          ))}
        </select>
      </label>
      {readOnly && (
        <p className="self-start rounded-full bg-warning/20 px-3 py-1 text-sm font-semibold text-gray-900">
          Solo lectura
        </p>
      )}
    </section>
  );
}
