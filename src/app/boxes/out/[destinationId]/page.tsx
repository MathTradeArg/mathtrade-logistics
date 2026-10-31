"use client";

import PackingDestination from '@/components/boxes/out/PackingDestination';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useParams } from 'next/navigation';

export default function BoxesOutDestinationPage() {
  const params = useParams<{ destinationId: string }>();
  return (
    <PackingDestination
      origin={EVENT_LOCATION_ID}
      destinationId={Number(params.destinationId)}
      basePath="/boxes/out"
      phaseGated
    />
  );
}
