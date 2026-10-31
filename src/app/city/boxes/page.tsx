"use client";

import PackingDestinations from '@/components/boxes/out/PackingDestinations';
import NoCity from '@/components/city/NoCity';
import { useCityView } from '@/contexts/CityViewContext';
import { listItems } from '@/hooks/boxes/boxApi';

export default function CityBoxesPage() {
  const { cityId, params } = useCityView();
  if (cityId === null) return <NoCity />;

  // Games that stay in the city (destination = the city) are delivered by
  // hand, never boxed; the hub (AMBA) stays a destination.
  return (
    <PackingDestinations
      origin={cityId}
      basePath="/city/boxes"
      phaseGated={false}
      loadItems={() => listItems({ origin: cityId, ...params })}
      excludeDestination={cityId}
      viewParams={params}
    />
  );
}
