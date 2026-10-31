"use client";

import PackingDestination from '@/components/boxes/out/PackingDestination';
import NoCity from '@/components/city/NoCity';
import { useCityId } from '@/hooks/city/useCity';
import { useParams } from 'next/navigation';

export default function CityBoxesDestinationPage() {
  const params = useParams<{ destinationId: string }>();
  const cityId = useCityId();
  if (cityId === null) return <NoCity />;

  return (
    <PackingDestination
      origin={cityId}
      destinationId={Number(params.destinationId)}
      basePath="/city/boxes"
      phaseGated={false}
      itemsOrigin={cityId}
    />
  );
}
