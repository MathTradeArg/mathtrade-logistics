"use client";

import PackingDestination from '@/components/boxes/out/PackingDestination';
import NoCity from '@/components/city/NoCity';
import { useCityView } from '@/contexts/CityViewContext';
import { useParams } from 'next/navigation';

export default function CityBoxesDestinationPage() {
  const routeParams = useParams<{ destinationId: string }>();
  const { cityId, params, readOnly } = useCityView();
  if (cityId === null) return <NoCity />;

  return (
    <PackingDestination
      origin={cityId}
      destinationId={Number(routeParams.destinationId)}
      basePath="/city/boxes"
      phaseGated={false}
      itemsOrigin={cityId}
      readOnly={readOnly}
      viewParams={params}
    />
  );
}
