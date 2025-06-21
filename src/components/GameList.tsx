"use client";

import { useEventPhase } from "../contexts/EventPhaseContext";
import type { Trade } from "@/types";
import { useEffect, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import GameRowItem from "./GameRowItem";

interface GameListProps {
  trades: Trade[];
  onUpdateItems: (itemIds: number[], deliveredByUserId: number) => Promise<void>;
  onFinish: () => void;
  deliveredByUserId: number | null;
}

const GameList: React.FC<GameListProps> = ({ trades, onUpdateItems, onFinish, deliveredByUserId }) => {
  const { eventPhase } = useEventPhase();
  const pendingItems = trades.filter(trade =>  !['Delivered','In Event'].includes(trade.result.status_display));
  const deliveredItemsCount = trades.length - pendingItems.length;

  const [selectedItems, setSelectedItems] = useState<Set<number>>(() => {
    const initialSelected = new Set<number>();
    if (trades) {
      trades.forEach(trade => {
        if (!['Delivered','In Event'].includes(trade.result.status_display)) {
          initialSelected.add(trade.result.assigned_trade_code);
        }
      });
    }
    return initialSelected;
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemsToConfirm, setItemsToConfirm] = useState<Trade[]>([]);
  const [confirmActionType, setConfirmActionType] = useState<'all' | 'selected' | null>(null);

  useEffect(() => {
    const initialSelected = new Set<number>();
    pendingItems.forEach(trade => initialSelected.add(trade.result.assigned_trade_code));
    setSelectedItems(initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);


  const handleToggleSelectedItem = (itemId: number) => {
    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  const handleDeliverAllPending = async () => {
    const itemsToConfirmDelivery = trades.filter(trade =>  !['Delivered','In Event'].includes(trade.result.status_display));
    if (itemsToConfirmDelivery.length > 0) {
      setItemsToConfirm(itemsToConfirmDelivery);
      setConfirmActionType('all');
      setIsConfirmModalOpen(true);
    }
  };

  const handleDeliverSelected = async () => {
    const itemsToConfirmDelivery = trades.filter(trade => selectedItems.has(trade.result.assigned_trade_code) && !['Delivered','In Event'].includes(trade.result.status_display));
    if (itemsToConfirmDelivery.length > 0) {
      setItemsToConfirm(itemsToConfirmDelivery);
      setConfirmActionType('selected');
      setIsConfirmModalOpen(true);
    }
  };

  const executeConfirmedDelivery = async () => {
    const itemIdsToDeliver = itemsToConfirm.map(trade => trade.result.assigned_trade_code);
    if (itemIdsToDeliver.length > 0 && deliveredByUserId !== null) {
      await onUpdateItems(itemIdsToDeliver, deliveredByUserId);
      setSelectedItems(new Set());
      if (confirmActionType === 'all') {
        setTimeout(() => {
          const finishButton = document.getElementById('finish-button');
          finishButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-secondary-blue dark:text-sky-400">
          {trades[0].to_member.first_name} {trades[0].to_member.last_name}
        </h2>
      </div>

      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Resumen: {pendingItems.length} {pendingItems.length === 1 ? 'juego pendiente' : 'juegos pendientes'} de {trades.length} en total:
        </p>
        {pendingItems.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {pendingItems.map((trade) => (
              <li key={`summary-${trade.result.assigned_trade_code}`}
                className="flex items-center p-2 bg-white dark:bg-gray-700/60 rounded-md shadow-sm"
              >
                <span className="font-bold text-secondary-blue dark:text-sky-400 w-10 text-center shrink-0 text-lg mr-3">{trade.result.assigned_trade_code}</span>
                <span className="truncate min-w-0">{trade.math_item_exchanged.title}</span>
              </li>
            ))}
          </ul>
        )}
        {deliveredItemsCount > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            ({deliveredItemsCount} ya {deliveredItemsCount === 1 ? 'entregado' : 'entregados'})
          </p>
        )}
      </div>

      {pendingItems.length > 0 && (
        <button
          onClick={handleDeliverAllPending}
          className="w-full mb-6 px-6 py-3 bg-accent-yellow text-gray-800 font-semibold rounded-lg shadow-md hover:opacity-85 transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={eventPhase !== 1}
          title={eventPhase !== 1 ? "La recepción de juegos está deshabilitada en la fase actual del evento" : ""}
        >
          Entregar TODO lo pendiente ({pendingItems.length})
        </button>
      )}

      {trades.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400 my-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">Este usuario no tiene juegos para entregar.</p>
      )}
      <ul className="space-y-3">
        {trades
          .slice()
          .sort((a, b) => {
            const getOrderStatus = (status_display: string): number => {
              if (status_display === "Delivered") return 3;
              if (status_display === "In Event") return 2;
              return 1; 
            };
            const orderA = getOrderStatus(a.result.status_display);
            const orderB = getOrderStatus(b.result.status_display);
            return orderA - orderB;
          })
          .map((trade: Trade) => (
            <GameRowItem
              key={trade.result.assigned_trade_code}
              id={trade.result.assigned_trade_code}
              title={trade.math_item_exchanged.title}
              statusDisplay={trade.result.status_display}
              isSelected={selectedItems.has(trade.result.assigned_trade_code)}
              onRowClick={!['Delivered','In Event'].includes(trade.result.status_display) ? () => handleToggleSelectedItem(trade.result.assigned_trade_code) : undefined}
              onCheckboxChange={() => handleToggleSelectedItem(trade.result.assigned_trade_code)}
              showCheckbox={true}
            />
          ))}
      </ul>
      {pendingItems.length > 0 && selectedItems.size > 0 && (
        <button
          onClick={handleDeliverSelected}
          className="w-full mt-4 px-6 py-3 bg-secondary-blue hover:opacity-85 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={eventPhase !== 1}
          title={eventPhase !== 1 ? "La recepción de juegos está deshabilitada en la fase actual del evento" : ""}
        >
          Entregar lo marcado ({selectedItems.size})
        </button>
      )}

      <button
        onClick={onFinish}
        id="finish-button"
        className="w-full mt-4 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out active:scale-95"
      >
        {pendingItems.length === 0 && trades.length > 0 ? 'Todo entregado. Siguiente QR' : 'Listo, otro QR'}
      </button>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executeConfirmedDelivery}
        itemsToDeliver={itemsToConfirm}
        actionType={confirmActionType || 'selected'}
      />
    </div>
  );
};

export default GameList;