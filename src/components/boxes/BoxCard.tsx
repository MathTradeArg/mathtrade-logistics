"use client";

import { SpinnerGap } from 'phosphor-react';
import React from 'react';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import type { Box } from '@/types';
import GameRowItem from '@/components/common/GameRowItem';
import { useHapticClick } from '@/hooks/useHapticClick';
interface BoxCardProps {
  box: Box;
  onToggleItemSelection: (boxId: number, itemId: number) => void;
  onDeliverSelected: (boxId: number) => Promise<void>;
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onToggleItemSelection, onDeliverSelected }) => {
  const { isProcessingAction } = useActionStatus();
  const handleDeliverSelected = useHapticClick(() => onDeliverSelected(box.id));

  return (
    <div>
      <ul className="space-y-2 w-full">
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
        {box.math_items.length === 0 && <li className="text-xs text-gray-400 dark:text-gray-500">Esta caja está vacía.</li>}
      </ul>
      {box.math_items.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">Esta caja está vacía.</p>}
      <button onClick={handleDeliverSelected} disabled={isProcessingAction || box.selectedItemIds.size === 0} className="w-full mt-4 px-4 py-2 text-sm nm-btn nm-btn-primary flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
        {isProcessingAction ? <SpinnerGap size={16} className="animate-spin mx-auto" /> : `Recibir Seleccionados (${box.selectedItemIds.size})`}
      </button>
    </div>
  );
};

export default BoxCard;
