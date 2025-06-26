"use client";

import type { Box } from '@/types/logistics';
import GameRowItem from '@/components/GameRowItem';

interface RecentlyCreatedBoxProps {
  box: Box;
}

export default function RecentlyCreatedBox({ box }: RecentlyCreatedBoxProps) {
  return (
    <div key={box.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-secondary-blue dark:text-sky-400">
          {box.number !== null ? `Caja #${box.number}` : 'Caja sin número'}
        </h4>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Destino: <span className="font-semibold">{box.destination_name}</span>
        </span>
      </div>
      <ul className="space-y-2">
        {box.math_items.map(item => (
          <GameRowItem
            key={item.assigned_trade_code}
            id={item.assigned_trade_code}
            title={item.title}
            variant="default"
          />
        ))}
      </ul>
    </div>
  );
}

