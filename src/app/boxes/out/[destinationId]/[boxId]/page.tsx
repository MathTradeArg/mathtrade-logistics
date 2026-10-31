"use client";

import PackingBox from '@/components/boxes/out/PackingBox';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { useParams } from 'next/navigation';

export default function OutgoingBoxPage() {
  const params = useParams<{ destinationId: string; boxId: string }>();
  return (
    <PackingBox
      origin={EVENT_LOCATION_ID}
      destinationId={Number(params.destinationId)}
      boxId={Number(params.boxId)}
      basePath="/boxes/out"
      phaseGated
    />
  );
}
