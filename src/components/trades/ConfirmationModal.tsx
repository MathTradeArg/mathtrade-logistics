"use client";

import type { Trade } from "@/types";
import { Warning, X } from 'phosphor-react';
import { useHapticClick } from '@/hooks/useHapticClick';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemsToDeliver: Trade[];
  actionType: 'all' | 'selected';
  modalTitle?: string;
  mode?: 'receive' | 'deliver';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, itemsToDeliver, actionType, modalTitle, mode = 'deliver' }) => {
  const handleClose = useHapticClick(onClose);
  const handleConfirm = useHapticClick(() => {
    onConfirm();
    onClose();
  });

  if (!isOpen) return null;

  const isReceiveMode = mode === 'receive';
  const defaultTitle = isReceiveMode 
    ? (actionType === 'all' ? "Confirmar Recepción Total" : "Confirmar Recepción de Seleccionados")
    : (actionType === 'all' ? "Confirmar Entrega Total" : "Confirmar Entrega de Seleccionados");
  
  const title = modalTitle || defaultTitle;
  const actionDescriptionText = isReceiveMode ? "Vas a marcar como recibidos los siguientes juegos:" : "Vas a marcar como entregados los siguientes juegos:";
  const buttonText = isReceiveMode 
    ? (actionType === 'all' ? `Recibir TODO (${itemsToDeliver.length})` : `Recibir Marcados (${itemsToDeliver.length})`)
    : (actionType === 'all' ? `Entregar TODO (${itemsToDeliver.length})` : `Entregar Marcados (${itemsToDeliver.length})`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(213,220,226,0.7)] p-4 backdrop-blur-sm">
      <div className="staff-panel flex w-full max-w-md flex-col p-6 text-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center text-xl font-bold">
            <Warning size={24} className="mr-2 text-warning" />
            {title}
          </h2>
          <button onClick={handleClose} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <p className="mb-3 text-gray-700">{actionDescriptionText}</p>
        <div className="mb-6 max-h-60 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-page p-3">
          {itemsToDeliver.length > 0 ? (
            itemsToDeliver.map(item => (
              <div key={`confirm-${item.result.assigned_trade_code}`} className="flex min-h-14 items-center rounded-lg bg-white px-3 text-sm">
                <span className="mr-2 w-10 shrink-0 text-center font-bold text-primary">{item.result.assigned_trade_code}</span>
                <span className="min-w-0 flex-grow text-gray-800">{item.math_item_exchanged.title}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No hay juegos seleccionados para esta acción.</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={itemsToDeliver.length === 0}
            className="staff-btn staff-btn-primary"
          >
            {buttonText}
          </button>
          <button
            onClick={handleClose}
            className="staff-btn staff-btn-outline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;