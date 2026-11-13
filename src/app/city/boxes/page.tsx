"use client";

import PackingDestinations from '@/components/boxes/out/PackingDestinations';
import NoCity from '@/components/city/NoCity';
import { useCityView } from '@/contexts/CityViewContext';
import { listItems } from '@/hooks/boxes/boxApi';
import { fileSlug } from '@/utils/xlsx';

export default function CityBoxesPage() {
  const { cityId, cityName, kind, params } = useCityView();
  if (cityId === null) return <NoCity />;

  // Games that stay in the city (destination = the city) are delivered by
  // hand, never boxed; the hub (AMBA) stays a destination.
  return (
    <PackingDestinations
      origin={cityId}
      basePath="/city/boxes"
      phaseGated={false}
      loadItems={() => listItems({ origin: cityId, includeSendAs: kind === 'referrer', excludeDelivered: true, ...params })}
      excludeDestination={cityId}
      viewParams={params}
      exportFileName={kind === 'referrer' ? `cajas_${fileSlug(cityName)}.xlsx` : undefined}
      intraExportFileName={kind === 'referrer' ? `intralocalidad_${fileSlug(cityName)}.xlsx` : undefined}
    />
  );
}
