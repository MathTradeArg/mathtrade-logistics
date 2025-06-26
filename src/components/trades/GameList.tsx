"use client";

import { GameRowItem } from "@/components/common";
import { ConfirmationModal } from '@/components/trades';
import type { Trade } from "@/types";
import { useEffect, useMemo, useState } from 'react';
import { useHapticClick } from '@/hooks/useHapticClick';

interface GameListProps {
  trades: Trade[];
  onUpdateItems: (itemIds: number[], deliveredByUserId: number) => Promise<void>;
  onFinish: () => void;
  deliveredByUserId: number | null;
  disabled?: boolean;
  mode: 'receive' | 'deliver';
}

const GameList: React.FC<GameListProps> = ({ disabled, trades, onUpdateItems, onFinish, deliveredByUserId, mode }) => {
  const config = useMemo(() => {
    const receiveConfig = {
      isUnavailable: (trade: Trade) => false,
      isPending: (trade: Trade) => !['Delivered', 'In Event'].includes(trade.result.status_display),
      isCompleted: (trade: Trade) => ['Delivered', 'In Event'].includes(trade.result.status_display),
      isSelectable: (trade: Trade) => !['Delivered', 'In Event'].includes(trade.result.status_display),
      texts: {
        pendingSingular: 'juego pendiente',
        pendingPlural: 'juegos pendientes',
        completedSingular: 'recibido',
        completedPlural: 'recibidos',
        mainAction: 'Recibir TODO lo pendiente',
        secondaryAction: 'Recibir lo marcado',
        noItems: 'Este usuario no tiene juegos para entregar en el evento.',
        finishButtonIdle: 'Listo, otro QR',
        finishButtonCompleted: 'Todo recibido. Siguiente QR',
        confirmTitle: 'Confirmar Recepción',
        disabledMessage: 'La recepción de juegos está deshabilitada en la fase actual del evento',
      },
      itemSortOrder: (status: string) => {
        if (['Delivered', 'In Event'].includes(status)) return 2;
        return 1;
      },
      mainButtonClass: 'bg-accent-yellow text-gray-800',
    };

    const deliverConfig = {
      isUnavailable: (trade: Trade) => !['Delivered', 'In Event'].includes(trade.result.status_display),
      isPending: (trade: Trade) => trade.result.status_display === 'In Event',
      isCompleted: (trade: Trade) => trade.result.status_display === 'Delivered',
      isSelectable: (trade: Trade) => trade.result.status_display === 'In Event',
      texts: {
        pendingSingular: 'juego para entregar',
        pendingPlural: 'juegos para entregar',
        completedSingular: 'entregado',
        completedPlural: 'entregados',
        mainAction: 'Entregar TODO lo listo',
        secondaryAction: 'Entregar lo marcado',
        noItems: 'Este usuario no tiene juegos pendientes de retirar.',
        finishButtonIdle: 'Escanear otro QR',
        finishButtonCompleted: 'Todo entregado. Siguiente QR',
        confirmTitle: `Confirmar Entrega a ${trades[0]?.to_member.first_name || ''}`,
        disabledMessage: 'La entrega de juegos está deshabilitada en la fase actual del evento',
      },
      itemSortOrder: (status: string) => {
        if (status === 'Delivered') return 3;
        if (status === 'In Event') return 1;
        return 2;
      },
      mainButtonClass: 'bg-accent-green text-gray-800',
    };

    return mode === 'receive' ? receiveConfig : deliverConfig;
  }, [mode, trades]);

  const pendingItems = useMemo(() => trades.filter(config.isPending), [trades, config]);
  const completedItemsCount = useMemo(() => trades.filter(config.isCompleted).length, [trades, config]);

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemsToConfirm, setItemsToConfirm] = useState<Trade[]>([]);
  const [confirmActionType, setConfirmActionType] = useState<'all' | 'selected' | null>(null);

  const handleToggleSelectedItem = useHapticClick((itemId: number) => {
    const trade = trades.find(t => t.result.assigned_trade_code === itemId);
    if (!trade || !config.isSelectable(trade)) {
      return;
    }

    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  });

  const handleConfirmAllPending = useHapticClick(() => {
    if (pendingItems.length > 0) {
      setItemsToConfirm(pendingItems);
      setConfirmActionType('all');
      setIsConfirmModalOpen(true);
    }
  });

  const handleConfirmSelected = useHapticClick(() => {
    const itemsToConfirmDelivery = trades.filter(trade => selectedItems.has(trade.result.assigned_trade_code) && config.isSelectable(trade));
    if (itemsToConfirmDelivery.length > 0) {
      setItemsToConfirm(itemsToConfirmDelivery);
      setConfirmActionType('selected');
      setIsConfirmModalOpen(true);
    }
  });

  const handleFinish = useHapticClick(onFinish);
  const handleCloseConfirmModal = useHapticClick(() => setIsConfirmModalOpen(false));

  useEffect(() => {
    const initialSelected = new Set<number>();
    pendingItems.forEach(trade => initialSelected.add(trade.result.assigned_trade_code));
    setSelectedItems(initialSelected);
  }, [pendingItems]);

  const executeConfirmedAction = async () => {
    const itemIdsToUpdate = itemsToConfirm.map(trade => trade.result.assigned_trade_code);
    if (itemIdsToUpdate.length > 0 && deliveredByUserId !== null) {
      await onUpdateItems(itemIdsToUpdate, deliveredByUserId);

      setSelectedItems(prev => {
        const newSet = new Set(prev);
        itemIdsToUpdate.forEach(id => newSet.delete(id));
        return newSet;
      });

      if (confirmActionType === 'all') {
        setTimeout(() => {
          const finishButton = document.getElementById('finish-button');
          finishButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  };

  const sortedTrades = useMemo(() =>
    [...trades].sort((a, b) => {
      const orderA = config.itemSortOrder(a.result.status_display);
      const orderB = config.itemSortOrder(b.result.status_display);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.result.assigned_trade_code - b.result.assigned_trade_code;
    }), [trades, config]);

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-secondary-blue dark:text-sky-400">
          {trades[0]?.to_member.first_name} {trades[0]?.to_member.last_name}
        </h2>
        {mode === 'deliver' && trades[0]?.result.table_number && (
          <p className="text-md text-gray-600 dark:text-gray-400 mt-1">Mesa: <span className="font-semibold">{trades[0].result.table_number}</span></p>
        )}
      </div>

      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Resumen: {pendingItems.length} {pendingItems.length === 1 ? config.texts.pendingSingular : config.texts.pendingPlural} de {trades.length} en total:
        </p>
        {pendingItems.length > 0 && (
      <ul className="mt-3 nm-list text-sm">
            {pendingItems.map((trade) => (
              <li key={`summary-${trade.result.assigned_trade_code}`}
                className="flex items-center p-2 nm-surface dark:bg-gray-700/60 rounded-md shadow-sm"
              >
                <span className="font-bold text-secondary-blue dark:text-sky-400 w-10 text-center shrink-0 text-lg mr-3">{trade.result.assigned_trade_code}</span>
                <span className="truncate min-w-0 text-gray-800 dark:text-sky-100">{trade.math_item_exchanged.title}</span>
              </li>
            ))}
          </ul>
        )}
        {completedItemsCount > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            ({completedItemsCount} ya {completedItemsCount === 1 ? config.texts.completedSingular : config.texts.completedPlural})
          </p>
        )}
      </div>

      {pendingItems.length > 0 && (
        <button
          onClick={handleConfirmAllPending}
          className={
            `w-full mb-6 nm-btn-primary disabled:opacity-50 disabled:cursor-not-allowed`
          }
          disabled={disabled}
          title={disabled ? config.texts.disabledMessage : ""}
        >
          {config.texts.mainAction} ({pendingItems.length})
        </button>
      )}

      {trades.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400 my-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">{config.texts.noItems}</p>
      )}
      <ul className="nm-list">
        {sortedTrades.map((trade: Trade) => (
          mode === 'receive' ? (
            config.isPending(trade) ? (
              <GameRowItem
                key={trade.result.assigned_trade_code}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title}
                statusDisplay={trade.result.status_display}
                isSelected={selectedItems.has(trade.result.assigned_trade_code)}
                onRowClick={() => handleToggleSelectedItem(trade.result.assigned_trade_code)}
                showCheckbox={false}
                variant="actionable"
              />
            ) : (
              <GameRowItem
                key={trade.result.assigned_trade_code}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title}
                statusDisplay={trade.result.status_display}
                showCheckbox={false}
                variant="delivered"
              />
            )
          ) : (
            config.isUnavailable(trade) ? (
              <GameRowItem
                key={trade.result.assigned_trade_code}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title}
                statusDisplay={trade.result.status_display}
                showCheckbox={false}
                variant="pendingOther"
              />
            ) : config.isCompleted(trade) ? (
              <GameRowItem
                key={trade.result.assigned_trade_code}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title}
                statusDisplay={trade.result.status_display}
                showCheckbox={false}
                variant="delivered"
              />
            ) : (
              <GameRowItem
                key={trade.result.assigned_trade_code}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title}
                statusDisplay={trade.result.status_display}
                isSelected={selectedItems.has(trade.result.assigned_trade_code)}
                onRowClick={config.isSelectable(trade) ? () => handleToggleSelectedItem(trade.result.assigned_trade_code) : undefined}
                showCheckbox={false}
                variant="actionable"
              />
            )
          )
        ))}
      </ul>
      {pendingItems.length > 0 && selectedItems.size > 0 && (
        <button
          onClick={handleConfirmSelected}
          className="w-full mt-4 nm-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled}
          title={disabled ? config.texts.disabledMessage : ""}
        >
          {config.texts.secondaryAction} ({selectedItems.size})
        </button>
      )}

      <button
        onClick={handleFinish}
        id="finish-button"
        className="w-full mt-4 nm-btn-finish"
      >
        {pendingItems.length === 0 && trades.length > 0 ? config.texts.finishButtonCompleted : config.texts.finishButtonIdle}
      </button>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={executeConfirmedAction}
        itemsToDeliver={itemsToConfirm}
        actionType={confirmActionType || 'selected'}
        modalTitle={config.texts.confirmTitle}
        mode={mode}
      />
    </div>
  );
};

export default GameList;