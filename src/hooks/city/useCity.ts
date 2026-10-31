"use client";

import { useAuth } from '@/hooks/useAuth';

/** The city the user builds and ships for (referrer first, else local
 *  volunteer), or null. */
export function useCityId(): number | null {
  const { cityAccess } = useAuth();
  return cityAccess?.city.id ?? null;
}
