"use client";

import PackingBox from '@/components/boxes/out/PackingBox';
import NoCity from '@/components/city/NoCity';
import { useCityView } from '@/contexts/CityViewContext';
import { useParams } from 'next/navigation';

export default function CityBoxPage() {
  const routeParams = useParams<{ destinationId: string; boxId: string }>();
  const { cityId, params, readOnly } = useCityView();
  if (cityId === null) return <NoCity />;

  return (
    <PackingBox
      origin={cityId}
      destinationId={Number(routeParams.destinationId)}
      boxId={Number(routeParams.boxId)}
      basePath="/city/boxes"
      phaseGated={false}
      itemsOrigin={cityId}
      readOnly={readOnly}
      viewParams={params}
    />
  );
}
