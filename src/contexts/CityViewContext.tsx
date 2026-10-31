"use client";

import type { CityViewParams } from '@/hooks/boxes/boxApi';
import { listLocations, listMathtrades } from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import type { CityAccess, CityRef, MathtradeRef } from '@/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const CITY_VIEW_STORAGE_KEY = 'logisticsCityView';

export type CityViewKind = 'referrer' | 'local';

/** Which city (and edition) the /city screens show. A referrer or local
 *  volunteer always sees their own city in the edition in course. An admin
 *  can pick any city and edition ("Ver como", as the web area's
 *  referrerView did): read-only whenever the pick isn't their own city in
 *  the active edition, because the backend only honours these params on
 *  reads and writes always act as the user. */
export type CityView = {
  isAdmin: boolean;
  /** How the screens behave: an admin always gets the referrer's view. */
  kind: CityViewKind | null;
  cityId: number | null;
  cityName: string;
  params: CityViewParams;
  readOnly: boolean;
  /** Admin picks (null = own city / active edition). */
  asLocation: number | null;
  mathtradeId: number | null;
  activeMathtradeId: number | null;
  locations: CityRef[];
  mathtrades: MathtradeRef[];
  setAsLocation(id: number | null): void;
  setMathtrade(id: number | null): void;
};

type ViewInput = {
  isAdmin: boolean;
  cityAccess: CityAccess;
  asLocation: number | null;
  mathtradeId: number | null;
  activeMathtradeId: number | null;
  locations: CityRef[];
};

type ViewRules = Pick<CityView, 'kind' | 'cityId' | 'cityName' | 'params' | 'readOnly'>;

/** The params and read-only rules, apart from React so they can be tested. */
export function cityViewRules({
  isAdmin, cityAccess, asLocation, mathtradeId, activeMathtradeId, locations,
}: ViewInput): ViewRules {
  if (!isAdmin) {
    return {
      kind: cityAccess?.kind ?? null,
      cityId: cityAccess?.city.id ?? null,
      cityName: cityAccess?.city.name ?? '',
      params: {},
      readOnly: false,
    };
  }
  const own = cityAccess?.city ?? null;
  const cityId = asLocation ?? own?.id ?? null;
  const params: CityViewParams = {};
  if (asLocation != null && asLocation !== own?.id) params.as_location = asLocation;
  if (mathtradeId != null && mathtradeId !== activeMathtradeId) params.mathtrade = mathtradeId;
  const cityName =
    locations.find((loc) => loc.id === cityId)?.name ?? (cityId != null && cityId === own?.id ? own.name : '');
  return {
    kind: cityId != null ? 'referrer' : null,
    cityId,
    cityName,
    params,
    readOnly: params.as_location != null || params.mathtrade != null,
  };
}

const CityViewContext = createContext<CityView | null>(null);

type Stored = { asLocation: number | null; mathtradeId: number | null };

function readStored(): Stored {
  try {
    const raw = sessionStorage.getItem(CITY_VIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      asLocation: typeof parsed?.asLocation === 'number' ? parsed.asLocation : null,
      mathtradeId: typeof parsed?.mathtradeId === 'number' ? parsed.mathtradeId : null,
    };
  } catch {
    return { asLocation: null, mathtradeId: null };
  }
}

function writeStored(value: Stored) {
  try {
    sessionStorage.setItem(CITY_VIEW_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: the pick just isn't remembered.
  }
}

export function CityViewProvider({ children }: { children: ReactNode }) {
  const { isAdmin: rawIsAdmin, cityAccess } = useAuth();
  const isAdmin = Boolean(rawIsAdmin);
  const [stored, setStored] = useState<Stored>({ asLocation: null, mathtradeId: null });
  const [restored, setRestored] = useState(false);
  const [locations, setLocations] = useState<CityRef[]>([]);
  const [mathtrades, setMathtrades] = useState<MathtradeRef[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    setStored(readStored());
    setRestored(true);
    let cancelled = false;
    listLocations().then((rows) => !cancelled && setLocations(rows)).catch(() => undefined);
    listMathtrades().then((rows) => !cancelled && setMathtrades(rows)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const activeMathtradeId = mathtrades.find((mt) => mt.active)?.id ?? null;

  const update = useCallback((patch: Partial<Stored>) => {
    setStored((prev) => {
      const next = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  const setAsLocation = useCallback(
    (id: number | null) => update({ asLocation: id }),
    [update],
  );
  const setMathtrade = useCallback(
    (id: number | null) => update({ mathtradeId: id != null && id === activeMathtradeId ? null : id }),
    [update, activeMathtradeId],
  );

  const value = useMemo<CityView>(() => {
    const rules = cityViewRules({
      isAdmin,
      cityAccess,
      asLocation: isAdmin ? stored.asLocation : null,
      mathtradeId: isAdmin ? stored.mathtradeId : null,
      activeMathtradeId,
      locations,
    });
    return {
      ...rules,
      isAdmin,
      asLocation: isAdmin ? stored.asLocation : null,
      mathtradeId: isAdmin ? stored.mathtradeId ?? activeMathtradeId : activeMathtradeId,
      activeMathtradeId,
      locations,
      mathtrades,
      setAsLocation,
      setMathtrade,
    };
  }, [isAdmin, cityAccess, stored, activeMathtradeId, locations, mathtrades, setAsLocation, setMathtrade]);

  // An admin's pick lives in sessionStorage: wait for it, so the screens
  // don't load the wrong city first.
  if (isAdmin && !restored) return null;

  return <CityViewContext.Provider value={value}>{children}</CityViewContext.Provider>;
}

const noop = () => undefined;

/** The city view; outside the /city layout it falls back to the user's own
 *  city (no admin picks). */
export function useCityView(): CityView {
  const context = useContext(CityViewContext);
  const { isAdmin, cityAccess } = useAuth();
  const fallback = useMemo<CityView>(() => ({
    ...cityViewRules({
      isAdmin: false, cityAccess: cityAccess ?? null, asLocation: null, mathtradeId: null,
      activeMathtradeId: null, locations: [],
    }),
    isAdmin: Boolean(isAdmin),
    asLocation: null,
    mathtradeId: null,
    activeMathtradeId: null,
    locations: [],
    mathtrades: [],
    setAsLocation: noop,
    setMathtrade: noop,
  }), [isAdmin, cityAccess]);
  return context ?? fallback;
}
