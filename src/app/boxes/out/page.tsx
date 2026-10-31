"use client";

import PackingDestinations from '@/components/boxes/out/PackingDestinations';
import { EVENT_LOCATION_ID } from '@/constants/event';
import { listItems } from '@/hooks/boxes/boxApi';

const loadItems = () => listItems({ excludeAmba: EVENT_LOCATION_ID });

export default function BoxesOutPage() {
  return (
    <PackingDestinations
      origin={EVENT_LOCATION_ID}
      basePath="/boxes/out"
      phaseGated
      loadItems={loadItems}
      excludeDestination={EVENT_LOCATION_ID}
    />
  );
}
