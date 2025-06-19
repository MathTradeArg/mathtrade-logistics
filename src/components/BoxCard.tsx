"use client";

import { Loader2 } from 'lucide-react';
import React from 'react';
import { useActionStatus } from '../contexts/ActionStatusContext';
import type { Box } from '../types/logistics';
import GameRowItem from './GameRowItem';
interface BoxCardProps {
  box: Box;
  onToggleItemSelection: (boxId: number, itemId: number) => void;
  onDeliverSelected: (boxId: number) => Promise<void>;
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onToggleItemSelection, onDeliverSelected }) => {
  const { isProcessingAction } = useActionStatus();

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col h-full">
      <ul className="space-y-2 overflow-y-auto pr-1 flex-grow mb-4">
        {box.math_items
          .slice()
          .sort((a, b) => a.assigned_trade_code - b.assigned_trade_code)
          .map(item => {
            const isItemDelivered = item.status === 5 || item.status === 6;
            const itemVariant = isItemDelivered ? 'delivered' : 'actionable';
            return (
              <GameRowItem
                key={item.assigned_trade_code}
                id={item.assigned_trade_code}
                title={item.title}
                ownerName={`${item.first_name} ${item.last_name}`}
                variant={itemVariant}
                showCheckbox={false}
                isSelected={!isItemDelivered && box.selectedItemIds.has(item.assigned_trade_code)}
                onRowClick={!isItemDelivered ? () => onToggleItemSelection(box.id, item.assigned_trade_code) : undefined}
              />
            );
          })}
        {box.math_items.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">Esta caja está vacía.</p>}
      </ul>
      <button onClick={() => onDeliverSelected(box.id)} disabled={isProcessingAction || box.selectedItemIds.size === 0} className="w-full px-4 py-2 text-sm bg-accent-green hover:bg-green-700 text-white font-semibold rounded-md shadow-sm transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
        {isProcessingAction ? <Loader2 size={16} className="animate-spin mx-auto" /> : `Recibir Seleccionados (${box.selectedItemIds.size})`}
      </button>
    </div>
  );
};

export default BoxCard;
