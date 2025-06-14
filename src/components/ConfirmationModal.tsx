"use client";

import type { Trade } from "@/types";
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemsToDeliver: Trade[];
  actionType: 'all' | 'selected';
  modalTitle?: string; 
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, itemsToDeliver, actionType, modalTitle }) => {
  if (!isOpen) return null;

  const title = modalTitle || (actionType === 'all' ? "Confirmar Entrega Total" : "Confirmar Entrega de Seleccionados");
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-blue dark:text-sky-400 flex items-center">
            <AlertTriangle size={24} className="mr-2 text-accent-yellow" />
            {"Confirmar Entrega"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <p className="mb-1 text-gray-700 dark:text-gray-300">Vas a marcar como entregados los siguientes juegos:</p>
        <div className="max-h-60 overflow-y-auto mb-6 p-3 bg-gray-100 dark:bg-gray-700/30 rounded-lg space-y-1">
          {itemsToDeliver.length > 0 ? (
            itemsToDeliver.map(item => (
              <div key={`confirm-${item.math_item_exchanged.id}`} className="flex items-center p-1.5 bg-white dark:bg-gray-700/60 rounded-md shadow-sm text-sm">
                <span className="font-bold text-secondary-blue dark:text-sky-400 w-10 text-center shrink-0 mr-2">{item.math_item_exchanged.id}</span>
                <span className="truncate min-w-0 flex-grow text-gray-700 dark:text-gray-200">{item.math_item_exchanged.title}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No hay juegos seleccionados para esta acción.</p>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg shadow-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose(); 
            }}
            disabled={itemsToDeliver.length === 0}
            className={`px-4 py-2 font-semibold rounded-lg shadow-sm transition-colors
                        ${itemsToDeliver.length === 0 
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                            : (actionType === 'all' 
                                ? 'bg-accent-yellow text-gray-800 hover:opacity-85' 
                                : 'bg-secondary-blue text-white hover:opacity-85')
                        }`}
          >
            {actionType === 'all' ? `Entregar TODO (${itemsToDeliver.length})` : `Entregar Marcados (${itemsToDeliver.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
