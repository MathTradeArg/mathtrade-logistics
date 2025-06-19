"use client";

import type { Trade } from "@/types";
import { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import GameRowItem from "./GameRowItem";

interface GamesToRetrieveListProps {
  trades: Trade[];
  volunteerId: number | null;
  onFinish: () => void;
  onDeliverySuccess: (deliveredTradeCodes: number[]) => void;
}

const GamesToRetrieveList: React.FC<GamesToRetrieveListProps> = ({ trades, volunteerId, onFinish, onDeliverySuccess }) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);

  const availableToDeliverTrades = trades.filter(trade => trade.result.status_display === "In Event");
  const alreadyDeliveredTrades = trades.filter(trade => trade.result.status_display === "Delivered");
  const otherStatusTrades = trades.filter(trade => !["In Event", "Delivered"].includes(trade.result.status_display));


  const handleOpenConfirmModal = () => {
    if (availableToDeliverTrades.length > 0) {
      setIsConfirmModalOpen(true);
    }
  };

  const executeDeliveryToUser = async () => {
    setIsLoadingDelivery(true);
    setDeliveryError(null);
    setDeliverySuccess(null);
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const codesToDeliver = availableToDeliverTrades.map(trade => trade.result.assigned_trade_code);
      const response = await fetch(`${MT_API_HOST}logistics/games/bulk-update-status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          assigned_trade_codes: codesToDeliver,
          status: 6,
          change_by_id: volunteerId
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al marcar juegos como entregados.`);
      }
      setDeliverySuccess(`Juegos entregados a ${trades[0].to_member.first_name} ${trades[0].to_member.last_name}.`);
      onDeliverySuccess(codesToDeliver); 
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Error desconocido al entregar.");
    } finally {
      setIsLoadingDelivery(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-secondary-blue dark:text-sky-400">
          {trades[0].to_member.first_name} {trades[0].to_member.last_name}
        </h2>
        {trades && trades.length > 0 && trades[0].result.table_number && (
          <p className="text-md text-gray-600 dark:text-gray-400 mt-1">Mesa: <span className="font-semibold">{trades[0].result.table_number}</span></p>
        )}
      </div>

      {trades.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400 my-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          Este usuario no tiene juegos pendientes de retirar.
        </p>
      ) : null}

      {availableToDeliverTrades.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Juegos Listos para Entregar ({availableToDeliverTrades.length}):
          </h3>
          <ul className="space-y-3">
            {availableToDeliverTrades.map((trade) => (
              <GameRowItem
                key={`deliver-${trade.result.assigned_trade_code}`}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title.replace(/\s*\(\d{4}\)$/, '')}
                ownerName={`${trade.from_member.first_name} ${trade.from_member.last_name}`}
                variant="default" 
              />
            ))}
          </ul>
        </div>
      )}

      {alreadyDeliveredTrades.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Juegos ya entregados ({alreadyDeliveredTrades.length}):
          </h3>
          <ul className="space-y-3">
            {alreadyDeliveredTrades.map((trade) => (
              <GameRowItem
                key={`delivered-${trade.result.assigned_trade_code}`}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title.replace(/\s*\(\d{4}\)$/, '')}
                ownerName={`${trade.from_member.first_name} ${trade.from_member.last_name}`}
                variant="delivered"
              />
            ))}
          </ul>
        </div>
      )}

      {otherStatusTrades.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Juegos Pendientes({otherStatusTrades.length}):
          </h3>
          <ul className="space-y-3">
            {otherStatusTrades.map((trade) => (
              <GameRowItem
                key={`other-${trade.result.assigned_trade_code}`}
                id={trade.result.assigned_trade_code}
                title={trade.math_item_exchanged.title.replace(/\s*\(\d{4}\)$/, '')}
                ownerName={`${trade.from_member.first_name} ${trade.from_member.last_name}`}
                variant="pendingOther"
              />
            ))}
          </ul>
        </div>
      )}

      {deliveryError && <p className="text-sm text-red-500 dark:text-red-400 mt-4 text-center">{deliveryError}</p>}
      {deliverySuccess && <p className="text-sm text-green-600 dark:text-green-400 mt-4 text-center">{deliverySuccess}</p>}

      {availableToDeliverTrades.length > 0 && !deliverySuccess && (
        <button
          onClick={handleOpenConfirmModal}
          disabled={isLoadingDelivery}
          className="w-full mt-4 px-6 py-3 bg-accent-green text-gray-800 font-semibold rounded-lg shadow-lg hover:opacity-85 transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {isLoadingDelivery ? "Procesando..." : `Entregar ${availableToDeliverTrades.length === 1 ? "Juego" : `${availableToDeliverTrades.length} Juegos`} a ${trades[0].to_member.first_name}`}
        </button>
      )}

      <button
        onClick={onFinish}
        className="w-full mt-4 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out active:scale-95"
      >
        Escanear otro QR
      </button>

      {isConfirmModalOpen && availableToDeliverTrades.length > 0 && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={executeDeliveryToUser}
          itemsToDeliver={availableToDeliverTrades}
          actionType="all"
          modalTitle={`Confirmar Entrega a ${trades[0].to_member.first_name}`}
        />
      )}
    </div>
  );
};

export default GamesToRetrieveList;
