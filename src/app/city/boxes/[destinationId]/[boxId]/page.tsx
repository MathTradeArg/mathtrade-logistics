"use client";

import PackingBox from '@/components/boxes/out/PackingBox';
import NoCity from '@/components/city/NoCity';
import { useCityId } from '@/hooks/city/useCity';
import { useParams } from 'next/navigation';

export default function CityBoxPage() {
  const params = useParams<{ destinationId: string; boxId: string }>();
  const cityId = useCityId();
  if (cityId === null) return <NoCity />;

  return (
    <PackingBox
      origin={cityId}
      destinationId={Number(params.destinationId)}
      boxId={Number(params.boxId)}
      basePath="/city/boxes"
      phaseGated={false}
      itemsOrigin={cityId}
    />
  );
}
