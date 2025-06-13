"use client";

import type { Game, Item, User } from "@/types";
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react'; 
import ConfirmationModal from './ConfirmationModal'; 

interface GameListProps {
  user: User;
  onUpdateItems: (itemIds: number[], deliveredByUserId: number) => Promise<void>;
  onFinish: () => void;
  deliveredByUserId: number | null;
}

const GameList: React.FC<GameListProps> = ({ user, onUpdateItems, onFinish, deliveredByUserId }) => {
  const pendingItems = user.items.filter(item => !item.delivered);
  const deliveredItemsCount = user.items.length - pendingItems.length;

  const [selectedItems, setSelectedItems] = useState<Set<number>>(() => {
    const initialSelected = new Set<number>();
    if (user && user.items) {
      user.items.forEach(item => {
        if (!item.delivered) {
          initialSelected.add(item.id);
        }
      });
    }
    return initialSelected;
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemsToConfirm, setItemsToConfirm] = useState<Item[]>([]);
  const [confirmActionType, setConfirmActionType] = useState<'all' | 'selected' | null>(null);

  useEffect(() => {
    const initialSelected = new Set<number>();
    pendingItems.forEach(item => initialSelected.add(item.id));
    setSelectedItems(initialSelected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]); 


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
    const itemsToConfirmDelivery = user.items.filter(item => !item.delivered);
    if (itemsToConfirmDelivery.length > 0) {
      setItemsToConfirm(itemsToConfirmDelivery);
      setConfirmActionType('all');
      setIsConfirmModalOpen(true);
    }
  };

  const handleDeliverSelected = async () => {
    const itemsToConfirmDelivery = user.items.filter(item => selectedItems.has(item.id) && !item.delivered);
    if (itemsToConfirmDelivery.length > 0) {
      setItemsToConfirm(itemsToConfirmDelivery);
      setConfirmActionType('selected');
      setIsConfirmModalOpen(true);
    }
  };

  const executeConfirmedDelivery = async () => {
    const itemIdsToDeliver = itemsToConfirm.map(item => item.id);
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
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID User: {user.id}</p>
      </div>

      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Resumen: {pendingItems.length} {pendingItems.length === 1 ? 'juego pendiente' : 'juegos pendientes'} de {user.items.length} en total:
        </p>
        {pendingItems.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {pendingItems.map((item) => (
              <li key={`summary-${item.id}`} 
                  className="flex items-center p-2 bg-white dark:bg-gray-700/60 rounded-md shadow-sm"
              >
                <span className="font-bold text-secondary-blue dark:text-sky-400 w-10 text-center shrink-0 text-lg mr-3">{item.id}</span>
                <span className="truncate min-w-0">{item.title}</span> 
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
          className="w-full mb-6 px-6 py-3 bg-accent-yellow text-gray-800 font-semibold rounded-lg shadow-md hover:opacity-85 transition-opacity duration-150 ease-in-out"
        >
          Entregar TODO lo pendiente ({pendingItems.length})
        </button>
      )}

      {user.items.length === 0 && (
        <p className="text-center text-gray-600 dark:text-gray-400 my-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">Este usuario no tiene juegos para entregar.</p>
      )}
      <ul className="space-y-3">
        {user.items
          .slice() 
          .sort((a, b) => (a.delivered === b.delivered ? 0 : a.delivered ? 1 : -1)) 
          .map((item: Item) => (
          <li
            key={item.id}
            className={`flex rounded-xl shadow-md transition-all duration-200 overflow-hidden
                            ${item.delivered
                ? 'bg-accent-green/30 dark:bg-accent-green/20 opacity-70' 
                : `bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg ${selectedItems.has(item.id) ? 'ring-2 ring-secondary-blue ring-offset-1 dark:ring-offset-gray-800' : ''}`}`}
            onClick={!item.delivered ? () => handleToggleSelectedItem(item.id) : undefined}
          >
            <div className={`flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4
                            ${item.delivered ? 'bg-secondary-blue/50' : 'bg-secondary-blue'} 
                            ${item.delivered ? 'cursor-default' : 'cursor-pointer'}`}>
              <span className={`text-2xl sm:text-3xl font-bold ${item.delivered ? 'text-white/70' : 'text-white'}`}>
                {item.id}
              </span>
            </div>
            <div className={`flex-grow p-3 sm:p-4 ${item.delivered ? 'cursor-default' : 'cursor-pointer'}`}>
              <label htmlFor={!item.delivered ? `checkbox-item-${item.id}` : undefined} className={`${!item.delivered ? 'cursor-pointer' : 'cursor-default'}`}>
                <span className={`text-base sm:text-lg font-semibold leading-tight ${item.delivered ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-secondary-blue dark:text-sky-400'}`}>
                   {item.title}
                </span>
                {item.elements.length > 1 && (
                  <div className="mt-1">
                    <p className={`text-xs ${item.delivered ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      Incluye:
                    </p>
                    <ul className={`list-disc list-inside ml-4 text-xs sm:text-sm ${item.delivered ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                      {item.elements.map((game: Game) => (
                        <li key={game.id}>{game.primary_name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </label>
            </div>

            <div className="flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4">
              {item.delivered ? (
                <div className="w-8 h-8 sm:w-15 sm:h-10 rounded-full flex items-center justify-center border-2 bg-accent-green border-accent-green">
                  <Check size={18} className="text-black" />
                </div>
              ) : (
                <>
                <input
                  type="checkbox"
                  id={`checkbox-item-${item.id}`}
                  className="sr-only peer" 
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleToggleSelectedItem(item.id)}
                />
                <label
                  htmlFor={`checkbox-item-${item.id}`} 
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 cursor-pointer
                              transition-colors duration-150 ease-in-out
                              peer-focus:ring-2 peer-focus:ring-offset-1 dark:peer-focus:ring-offset-gray-800
                              ${selectedItems.has(item.id)
                      ? 'bg-secondary-blue border-secondary-blue peer-focus:ring-secondary-blue'
                      : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 peer-focus:ring-gray-400'}`}
                >
                  {selectedItems.has(item.id) && <Check size={18} className="text-white" />}
                </label>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {pendingItems.length > 0 && selectedItems.size > 0 && (
        <button
          onClick={handleDeliverSelected}
          className="w-full mt-8 px-6 py-3 bg-secondary-blue hover:opacity-85 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out"
        >
          Entregar lo marcado ({selectedItems.size})
        </button>
      )}

      <button
        onClick={onFinish}
        id="finish-button" // Añadimos un ID al botón
        className="w-full mt-4 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out"
      >
        {pendingItems.length === 0 && user.items.length > 0 ? 'Todo entregado. Siguiente QR' : 'Listo, otro QR'}
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