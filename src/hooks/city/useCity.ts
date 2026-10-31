"use client";

import { useCityView } from '@/contexts/CityViewContext';

/** The city the /city screens show: the user's own (referrer first, else
 *  local volunteer), or the one an admin picked in "Ver como"; or null. */
export function useCityId(): number | null {
  return useCityView().cityId;
}
