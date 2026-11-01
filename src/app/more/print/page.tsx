"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { StaffPage, StaffSearch } from '@/components/staff';
import { useStaffTitle } from '@/components/staff/StaffTitleContext';
import {
  AMBA_REFERRER_INFO,
  findReferrerInfo,
  INTERIOR_REFERRER_DIRECTORY,
  type LocationReferrerInfo,
} from '@/config/referrers';
import { boxFetch } from '@/hooks/boxes/boxApi';
import { matchesSearch } from '@/hooks/boxes/boxGrouping';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

type PrintTab = 'labels' | 'sectors' | 'windows' | 'tables';
type BoxRouteKind = 'amba_direct' | 'amba_via' | 'interior';
type SectorKind = 'both' | 'unpack' | 'pack';
type CircleFill = 'filled' | 'empty';

type WindowConfigItem = {
  id?: number;
  name: string;
  tables: string[];
};

/** Giant visual circle symbol for boxes travelling to CABA:
 *  - Filled circle (●) when CABA is the final destination
 *  - Empty circle (○) when CABA is an intermediate stop (Leg 1 = CABA) */
function BoxCircleSymbol({ fill }: { fill: CircleFill }) {
  const isFilled = fill === 'filled';
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border-4 border-black bg-white p-4 text-center">
      <svg
        viewBox="0 0 200 200"
        className="h-52 w-52 sm:h-60 sm:w-60 print:h-56 print:w-56 text-black"
        role="img"
        aria-label={
          isFilled
            ? 'Círculo lleno: Destino final CABA'
            : 'Círculo vacío: Paso intermedio por CABA'
        }
      >
        <circle
          cx="100"
          cy="100"
          r="86"
          fill={isFilled ? '#000' : 'none'}
          stroke="#000"
          strokeWidth="16"
        />
      </svg>
      <span className="mt-2 text-sm font-black tracking-wider text-black uppercase">
        {isFilled ? 'CÍRCULO LLENO · FINAL CABA' : 'CÍRCULO VACÍO · VÍA CABA'}
      </span>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50dvh] items-center justify-center">
          <LoadingSpinner message="Cargando..." />
        </div>
      }
    >
      <PrintPageContent />
    </Suspense>
  );
}

function PrintPageContent() {
  useStaffTitle('Imprimir');
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();

  const initialTab = (searchParams.get('tab') as PrintTab) || 'labels';
  const [tab, setTab] = useState<PrintTab>(
    ['labels', 'sectors', 'windows', 'tables'].includes(initialTab) ? initialTab : 'labels',
  );

  // --- Box Labels State ---
  const [routeKind, setRouteKind] = useState<BoxRouteKind>('amba_direct');
  const [copiesPerDest, setCopiesPerDest] = useState<number>(1);
  const [boxNumberText, setBoxNumberText] = useState<string>('');
  const [onwardCityText, setOnwardCityText] = useState<string>('');
  const [senderCity, setSenderCity] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderDni, setSenderDni] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [labelDestQuery, setLabelDestQuery] = useState<string>('');
  const [selectedLabelDests, setSelectedLabelDests] = useState<Set<number>>(
    () => new Set([INTERIOR_REFERRER_DIRECTORY[0]?.locationId ?? 3]),
  );
  const [customAddresses, setCustomAddresses] = useState<Record<number, string>>({});

  // --- Sectors State ---
  const [sectorKind, setSectorKind] = useState<SectorKind>('both');
  const [sectorQuery, setSectorQuery] = useState<string>('');
  const [selectedSectorLocs, setSelectedSectorLocs] = useState<Set<number>>(
    () => new Set(INTERIOR_REFERRER_DIRECTORY.map((loc) => loc.locationId)),
  );

  // --- Windows & Tables State ---
  const [windows, setWindows] = useState<WindowConfigItem[]>([
    { name: 'Ventanilla 1', tables: ['1', '2', '3'] },
    { name: 'Ventanilla 2', tables: ['4', '5', '6'] },
    { name: 'Ventanilla 3', tables: ['7', '8', '9'] },
  ]);
  const [windowCountInput, setWindowCountInput] = useState<number>(3);
  const [tableStart, setTableStart] = useState<number>(1);
  const [tableEnd, setTableEnd] = useState<number>(15);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    boxFetch<WindowConfigItem[]>('logistics/windows/config/')
      .then((rows) => {
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          setWindows(rows);
          setWindowCountInput(rows.length);
          const allTableNums = rows
            .flatMap((w) => w.tables)
            .map((t) => Number(t))
            .filter((n) => Number.isFinite(n) && n > 0);
          if (allTableNums.length > 0) {
            setTableStart(Math.min(...allTableNums));
            setTableEnd(Math.max(...allTableNums));
          }
        }
      })
      .catch(() => undefined);

    boxFetch<{ available_tables: string[]; assigned_tables: string[] }>(
      'logistics/windows/available-tables/',
    )
      .then((data) => {
        if (cancelled || !data) return;
        const nums = [...(data.available_tables || []), ...(data.assigned_tables || [])]
          .map((t) => Number(t))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (nums.length > 0) {
          setTableStart(Math.min(...nums));
          setTableEnd(Math.max(...nums));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleSenderPreset = (locationIdStr: string) => {
    if (!locationIdStr) {
      setSenderCity('');
      setSenderName('');
      setSenderDni('');
      setSenderPhone('');
      return;
    }
    const info = findReferrerInfo(Number(locationIdStr));
    if (!info) return;
    const ref = info.referrers[0];
    setSenderCity(info.city);
    setSenderName(ref?.name ?? '');
    setSenderDni(ref?.dni ?? '');
    setSenderPhone(ref?.phone ?? '');
  };

  const filteredLabelLocations = useMemo(
    () =>
      INTERIOR_REFERRER_DIRECTORY.filter((loc) =>
        matchesSearch(
          [loc.city, loc.code, ...loc.referrers.map((r) => r.name)].join(' '),
          labelDestQuery,
        ),
      ),
    [labelDestQuery],
  );

  const filteredSectorLocations = useMemo(
    () =>
      INTERIOR_REFERRER_DIRECTORY.filter((loc) =>
        matchesSearch([loc.city, loc.code].join(' '), sectorQuery),
      ),
    [sectorQuery],
  );

  const toggleSetItem = (
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    id: number,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const labelsToRender = useMemo(() => {
    const count = Math.max(1, Math.min(20, copiesPerDest || 1));
    if (routeKind === 'amba_direct') {
      return Array.from({ length: count }, (_, idx) => ({
        key: `caba-direct-${idx}`,
        circleFill: 'filled' as CircleFill | null,
        destInfo: AMBA_REFERRER_INFO,
        addressOverride: customAddresses[AMBA_REFERRER_INFO.locationId],
        payOnDelivery: true,
        isViaCabaOnward: false,
      }));
    }
    if (routeKind === 'amba_via') {
      return Array.from({ length: count }, (_, idx) => ({
        key: `caba-via-${idx}`,
        circleFill: 'empty' as CircleFill | null,
        destInfo: AMBA_REFERRER_INFO,
        addressOverride: customAddresses[AMBA_REFERRER_INFO.locationId],
        payOnDelivery: true,
        isViaCabaOnward: true,
      }));
    }
    const chosen = INTERIOR_REFERRER_DIRECTORY.filter((loc) =>
      selectedLabelDests.has(loc.locationId),
    );
    const list: {
      key: string;
      circleFill: CircleFill | null;
      destInfo: LocationReferrerInfo;
      addressOverride?: string;
      payOnDelivery: boolean;
      isViaCabaOnward: boolean;
    }[] = [];
    chosen.forEach((loc) => {
      for (let idx = 0; idx < count; idx += 1) {
        list.push({
          key: `interior-${loc.locationId}-${idx}`,
          circleFill: null,
          destInfo: loc,
          addressOverride: customAddresses[loc.locationId],
          payOnDelivery: false,
          isViaCabaOnward: false,
        });
      }
    });
    return list;
  }, [routeKind, copiesPerDest, selectedLabelDests, customAddresses]);

  const sectorSigns = useMemo(() => {
    const chosen = INTERIOR_REFERRER_DIRECTORY.filter((loc) =>
      selectedSectorLocs.has(loc.locationId),
    );
    const signs: { key: string; mode: 'unpack' | 'pack'; loc: LocationReferrerInfo }[] = [];
    chosen.forEach((loc) => {
      if (sectorKind === 'both' || sectorKind === 'unpack') {
        signs.push({ key: `unpack-${loc.locationId}`, mode: 'unpack', loc });
      }
      if (sectorKind === 'both' || sectorKind === 'pack') {
        signs.push({ key: `pack-${loc.locationId}`, mode: 'pack', loc });
      }
    });
    return signs;
  }, [sectorKind, selectedSectorLocs]);

  const tableNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(tableStart, tableEnd));
    const end = Math.min(200, Math.max(tableStart, tableEnd));
    const list: number[] = [];
    for (let n = start; n <= end; n += 1) {
      list.push(n);
    }
    return list;
  }, [tableStart, tableEnd]);

  const applyWindowCount = (count: number) => {
    const clamped = Math.max(1, Math.min(30, count));
    setWindowCountInput(clamped);
    setWindows((prev) => {
      const next: WindowConfigItem[] = [];
      for (let i = 0; i < clamped; i += 1) {
        next.push(prev[i] || { name: `Ventanilla ${i + 1}`, tables: [] });
      }
      return next;
    });
  };

  if (authIsLoading || isAuthenticated === null) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <LoadingSpinner message="Cargando..." />
      </div>
    );
  }

  return (
    <StaffPage className="print-container pb-24">
      <div className="no-print space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { id: 'labels' as const, label: 'Etiquetas de cajas' },
            { id: 'sectors' as const, label: 'Sectores (Localidades)' },
            { id: 'windows' as const, label: 'Ventanillas' },
            { id: 'tables' as const, label: 'Mesas' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`min-h-12 rounded-lg px-3 py-2 text-sm font-semibold border ${
                tab === option.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {tab === 'labels' && (
          <div className="staff-card space-y-4 p-4">
            <h2 className="text-base font-bold text-gray-900">
              Configurar etiquetas de cajas
            </h2>
            <p className="text-sm text-gray-600">
              Podés imprimirlas antes de crear las cajas. Los campos que dejes vacíos salen con línea para completar a mano.
            </p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de caja y código visual
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setRouteKind('amba_direct')}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left ${
                    routeKind === 'amba_direct'
                      ? 'border-primary bg-primary/10 font-bold text-gray-900'
                      : 'border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  <span>● Viaja a CABA y TERMINA EN CABA (Círculo lleno)</span>
                  <span className="text-xs font-semibold uppercase">Pago en destino</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRouteKind('amba_via')}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left ${
                    routeKind === 'amba_via'
                      ? 'border-primary bg-primary/10 font-bold text-gray-900'
                      : 'border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  <span>○ Viaja a CABA y SIGUE A OTRA LOCALIDAD · Vía CABA (Círculo vacío)</span>
                  <span className="text-xs font-semibold uppercase">Pago en destino</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRouteKind('interior')}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left ${
                    routeKind === 'interior'
                      ? 'border-primary bg-primary/10 font-bold text-gray-900'
                      : 'border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  <span>Viaja a localidad del interior (desde el evento o directo)</span>
                  <span className="text-xs font-semibold uppercase">Por localidad</span>
                </button>
              </div>
            </div>

            {routeKind === 'amba_via' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localidad(es) final(es) a las que sigue (opcional, si lo dejás vacío queda para escribir a mano)
                </label>
                <input
                  type="text"
                  value={onwardCityText}
                  onChange={(e) => setOnwardCityText(e.target.value)}
                  placeholder="Ej: Catamarca / Salta (o dejalo vacío para rellenar)"
                  className="min-h-12 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
            )}

            {routeKind === 'interior' && (
              <div className="space-y-3 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Localidades de destino ({selectedLabelDests.size} seleccionadas)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLabelDests(
                          new Set(INTERIOR_REFERRER_DIRECTORY.map((l) => l.locationId)),
                        )
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLabelDests(new Set())}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <StaffSearch
                  value={labelDestQuery}
                  onChange={(e) => setLabelDestQuery(e.target.value)}
                  placeholder="Buscar localidad o referente"
                  aria-label="Buscar localidad de destino para etiquetas"
                />
                <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                  {filteredLabelLocations.map((loc) => {
                    const checked = selectedLabelDests.has(loc.locationId);
                    const refNames = loc.referrers.map((r) => r.name).join(' / ');
                    return (
                      <div key={loc.locationId} className="rounded p-2 hover:bg-gray-50">
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSetItem(setSelectedLabelDests, loc.locationId)}
                            className="mt-1 h-4 w-4"
                          />
                          <span className="flex-1">
                            <span className="font-semibold">{loc.city}</span> ({loc.code}) · {refNames}
                            <span className="block text-xs text-gray-500">
                              {customAddresses[loc.locationId] ??
                                (loc.address || 'Dirección Vía Cargo sin definir (sale línea para rellenar)')}
                            </span>
                          </span>
                        </label>
                        {checked && (
                          <input
                            type="text"
                            value={customAddresses[loc.locationId] ?? loc.address}
                            onChange={(e) =>
                              setCustomAddresses((prev) => ({
                                ...prev,
                                [loc.locationId]: e.target.value,
                              }))
                            }
                            placeholder="Dirección Sucursal Vía Cargo (vacío = línea rellenable)"
                            className="mt-1 min-h-10 w-full rounded border border-gray-200 px-2 text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad de etiquetas por destino
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={copiesPerDest}
                  onChange={(e) => setCopiesPerDest(Number(e.target.value) || 1)}
                  className="min-h-12 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de caja (dejalo vacío para rellenar a mano)
                </label>
                <input
                  type="text"
                  value={boxNumberText}
                  onChange={(e) => setBoxNumberText(e.target.value)}
                  placeholder="Vacío = recuadro rellenable"
                  className="min-h-12 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Datos del referente que envía (opcional · vacío = líneas para rellenar a mano)
                </span>
                <select
                  value=""
                  onChange={(e) => handleSenderPreset(e.target.value)}
                  aria-label="Pre-cargar remitente por localidad"
                  className="min-h-10 rounded border border-gray-300 px-2 text-xs"
                >
                  <option value="">Pre-cargar desde una localidad o dejar vacío...</option>
                  <option value={String(AMBA_REFERRER_INFO.locationId)}>CABA (Germán Kijel)</option>
                  {INTERIOR_REFERRER_DIRECTORY.map((loc) => (
                    <option key={loc.locationId} value={String(loc.locationId)}>
                      {loc.city} ({loc.referrers.map((r) => r.name).join(' / ')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={senderCity}
                  onChange={(e) => setSenderCity(e.target.value)}
                  placeholder="Localidad que envía (vacío = rellenable)"
                  className="min-h-10 rounded border border-gray-300 px-3 text-sm"
                />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Nombre referente que envía (vacío = rellenable)"
                  className="min-h-10 rounded border border-gray-300 px-3 text-sm"
                />
                <input
                  type="text"
                  value={senderDni}
                  onChange={(e) => setSenderDni(e.target.value)}
                  placeholder="DNI referente que envía (vacío = rellenable)"
                  className="min-h-10 rounded border border-gray-300 px-3 text-sm"
                />
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="Teléfono referente que envía (vacío = rellenable)"
                  className="min-h-10 rounded border border-gray-300 px-3 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'sectors' && (
          <div className="staff-card space-y-4 p-4">
            <h2 className="text-base font-bold text-gray-900">
              Carteles para sectores de Armado y Desarmado por localidad
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'both' as const, label: 'Armado y Desarmado (ambos)' },
                { id: 'unpack' as const, label: 'Solo Desarmado (Llegan)' },
                { id: 'pack' as const, label: 'Solo Armado (Salen)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSectorKind(opt.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    sectorKind === opt.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Localidades ({selectedSectorLocs.size} seleccionadas)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSectorLocs(
                      new Set(INTERIOR_REFERRER_DIRECTORY.map((l) => l.locationId)),
                    )
                  }
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold"
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSectorLocs(new Set())}
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold"
                >
                  Ninguna
                </button>
              </div>
            </div>
            <StaffSearch
              value={sectorQuery}
              onChange={(e) => setSectorQuery(e.target.value)}
              placeholder="Buscar localidad"
              aria-label="Buscar localidad para sectores"
            />
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-3">
              {filteredSectorLocations.map((loc) => (
                <label
                  key={loc.locationId}
                  className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSectorLocs.has(loc.locationId)}
                    onChange={() => toggleSetItem(setSelectedSectorLocs, loc.locationId)}
                    className="h-4 w-4"
                  />
                  <span className="truncate">
                    {loc.city} ({loc.code})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'windows' && (
          <div className="staff-card space-y-4 p-4">
            <h2 className="text-base font-bold text-gray-900">
              Identificaciones para Ventanillas
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Cantidad de ventanillas:
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={windowCountInput}
                onChange={(e) => applyWindowCount(Number(e.target.value) || 1)}
                className="min-h-10 w-24 rounded border border-gray-300 px-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {windows.map((win, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={win.name}
                  onChange={(e) =>
                    setWindows((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row)),
                    )
                  }
                  placeholder={`Ventanilla ${idx + 1}`}
                  className="min-h-10 rounded border border-gray-300 px-3 text-sm"
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'tables' && (
          <div className="staff-card space-y-4 p-4">
            <h2 className="text-base font-bold text-gray-900">
              Identificaciones para Mesas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde mesa Nº
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={tableStart}
                  onChange={(e) => setTableStart(Number(e.target.value) || 1)}
                  className="min-h-10 w-full rounded border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta mesa Nº
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={tableEnd}
                  onChange={(e) => setTableEnd(Number(e.target.value) || 1)}
                  className="min-h-10 w-full rounded border border-gray-300 px-3 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="staff-btn staff-btn-primary"
        >
          Imprimir ({tab === 'labels'
            ? `${labelsToRender.length} etiquetas`
            : tab === 'sectors'
              ? `${sectorSigns.length} carteles`
              : tab === 'windows'
                ? `${windows.length} ventanillas`
                : `${tableNumbers.length} mesas`})
        </button>
      </div>

      {/* --- PRINTABLE SHEETS --- */}
      <div className="mt-6 space-y-6 print:mt-0 print:space-y-0">
        {tab === 'labels' &&
          labelsToRender.map((item) => {
            const address =
              item.addressOverride !== undefined ? item.addressOverride : item.destInfo.address;
            return (
              <section
                key={item.key}
                className="print-sheet rounded-xl border-4 border-black bg-white p-6 text-black"
              >
                {/* Top Header: Destination + Giant Circle Symbol (for CABA) + Box Number */}
                <div className="grid grid-cols-1 gap-4 border-b-4 border-black pb-4 sm:grid-cols-12 sm:items-stretch">
                  <div
                    className={`flex flex-col justify-between ${
                      item.circleFill ? 'sm:col-span-4' : 'sm:col-span-8'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold tracking-widest uppercase">
                        DESTINO DEL ENVÍO
                      </p>
                      <h2 className="mt-1 text-5xl font-black uppercase leading-none">
                        {item.destInfo.city}
                      </h2>
                      {item.isViaCabaOnward && (
                        <div className="mt-3 rounded-lg border-2 border-black bg-gray-100 p-2">
                          <p className="text-xs font-bold uppercase">
                            PASA POR CABA · SIGUE A LOCALIDAD(ES):
                          </p>
                          {onwardCityText.trim() ? (
                            <p className="mt-1 text-xl font-black uppercase">
                              {onwardCityText}
                            </p>
                          ) : (
                            <div className="mt-4 border-b-2 border-dashed border-black" />
                          )}
                        </div>
                      )}
                    </div>

                    {item.payOnDelivery && (
                      <div className="mt-4 inline-block rounded-lg border-4 border-black bg-black px-4 py-2 text-center text-2xl font-black tracking-wider text-white uppercase print:border-black print:text-black print:bg-white">
                        PAGO EN DESTINO
                      </div>
                    )}
                  </div>

                  {item.circleFill && (
                    <div className="sm:col-span-5 flex items-center justify-center">
                      <BoxCircleSymbol fill={item.circleFill} />
                    </div>
                  )}

                  <div
                    className={`${
                      item.circleFill ? 'sm:col-span-3' : 'sm:col-span-4'
                    } flex flex-col justify-between rounded-xl border-4 border-black p-3 text-center`}
                  >
                    <span className="text-xs font-black tracking-wider uppercase">
                      CAJA Nº
                    </span>
                    <div className="my-auto flex min-h-24 items-center justify-center">
                      {boxNumberText.trim() ? (
                        <span className="text-4xl font-black">{boxNumberText}</span>
                      ) : (
                        <span className="text-xs text-gray-400 print:hidden">
                          (Rellenar a mano)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold">
                      (Origen - Caja / #)
                    </span>
                  </div>
                </div>

                {/* Middle: Destination Address & Recipient Referrer */}
                <div className="mt-4 grid grid-cols-1 gap-4 border-b-4 border-black pb-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black tracking-wider uppercase">
                      DIRECCIÓN / SUCURSAL VÍA CARGO DESTINO
                    </p>
                    {address && address.trim() ? (
                      <p className="mt-1 text-lg font-bold leading-snug">{address}</p>
                    ) : (
                      <div className="mt-6 space-y-5">
                        <div className="border-b-2 border-dashed border-black" />
                        <div className="border-b-2 border-dashed border-black" />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black tracking-wider uppercase">
                      RECIBE (REFERENTE DESTINO)
                    </p>
                    <div className="mt-1 space-y-2">
                      {item.destInfo.referrers.map((ref, rIdx) => (
                        <div key={rIdx} className="text-sm leading-snug">
                          <p className="text-lg font-extrabold">{ref.name}</p>
                          <p className="font-semibold">
                            DNI:{' '}
                            {ref.dni ? (
                              <span>{ref.dni}</span>
                            ) : (
                              <span className="inline-block w-36 border-b border-dashed border-black" />
                            )}{' '}
                            · Tel:{' '}
                            {ref.phone ? (
                              <span>{ref.phone}</span>
                            ) : (
                              <span className="inline-block w-36 border-b border-dashed border-black" />
                            )}
                          </p>
                          {ref.telegram && (
                            <p className="text-xs font-medium">Telegram: {ref.telegram}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom: Fillable Sender Referrer Info */}
                <div className="mt-4">
                  <p className="text-xs font-black tracking-wider uppercase">
                    ENVÍA (DATOS DEL REFERENTE REMITENTE)
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-end gap-2">
                      <span className="text-sm font-bold whitespace-nowrap">Localidad origen:</span>
                      {senderCity.trim() ? (
                        <span className="flex-1 border-b-2 border-black px-1 text-base font-bold">
                          {senderCity}
                        </span>
                      ) : (
                        <span className="flex-1 border-b-2 border-dashed border-black py-2" />
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-sm font-bold whitespace-nowrap">Nombre y Apellido:</span>
                      {senderName.trim() ? (
                        <span className="flex-1 border-b-2 border-black px-1 text-base font-bold">
                          {senderName}
                        </span>
                      ) : (
                        <span className="flex-1 border-b-2 border-dashed border-black py-2" />
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-sm font-bold whitespace-nowrap">DNI:</span>
                      {senderDni.trim() ? (
                        <span className="flex-1 border-b-2 border-black px-1 text-base font-bold">
                          {senderDni}
                        </span>
                      ) : (
                        <span className="flex-1 border-b-2 border-dashed border-black py-2" />
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-sm font-bold whitespace-nowrap">Teléfono:</span>
                      {senderPhone.trim() ? (
                        <span className="flex-1 border-b-2 border-black px-1 text-base font-bold">
                          {senderPhone}
                        </span>
                      ) : (
                        <span className="flex-1 border-b-2 border-dashed border-black py-2" />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

        {tab === 'sectors' &&
          sectorSigns.map((sign) => (
            <section
              key={sign.key}
              className="print-sheet-a4 flex min-h-[85vh] flex-col justify-between rounded-xl border-4 border-black bg-white p-10 text-center text-black"
            >
              <div className="border-b-4 border-black pb-6">
                <p className="text-3xl font-black tracking-widest uppercase">
                  {sign.mode === 'unpack'
                    ? 'SECTOR DESARMADO DE CAJAS (LLEGAN)'
                    : 'SECTOR ARMADO DE CAJAS (SALEN)'}
                </p>
              </div>
              <div className="my-auto flex flex-1 flex-col items-center justify-center py-8">
                <p className="text-9xl font-black uppercase tracking-tight leading-none">
                  {sign.loc.code}
                </p>
                <h2 className="mt-6 text-7xl font-black uppercase leading-tight">
                  {sign.loc.city}
                </h2>
              </div>
            </section>
          ))}

        {tab === 'windows' &&
          windows.map((win, idx) => (
            <section
              key={idx}
              className="print-sheet-a4 flex min-h-[85vh] flex-col justify-between rounded-xl border-4 border-black bg-white p-10 text-center text-black"
            >
              <div className="border-b-4 border-black pb-6">
                <p className="text-3xl font-black tracking-widest uppercase">
                  MATH TRADE ARGENTINA · ENTREGA Y RECEPCIÓN
                </p>
              </div>
              <div className="my-auto flex flex-1 items-center justify-center py-8">
                <h2 className="text-8xl font-black uppercase leading-none">
                  {win.name}
                </h2>
              </div>
              <div className="border-t-4 border-black pt-6">
                <p className="text-3xl font-black uppercase">
                  Acercate con tu QR
                </p>
                <p className="mt-2 text-2xl font-bold uppercase">
                  Para retirar: cuando hagamos las entregas, esperá a aparecer en pantalla
                </p>
              </div>
            </section>
          ))}

        {tab === 'tables' &&
          tableNumbers.map((num) => (
            <section
              key={num}
              className="print-sheet-a4 flex min-h-[85vh] flex-col justify-between rounded-xl border-4 border-black bg-white p-10 text-center text-black"
            >
              <div className="border-b-4 border-black pb-6">
                <p className="text-3xl font-black tracking-widest uppercase">
                  MATH TRADE ARGENTINA · SECTOR DE MESAS
                </p>
              </div>
              <div className="my-auto flex flex-1 flex-col items-center justify-center py-8">
                <p className="text-6xl font-bold uppercase">MESA</p>
                <h2 className="mt-4 text-[11rem] font-black leading-none">{num}</h2>
              </div>
            </section>
          ))}
      </div>
    </StaffPage>
  );
}
