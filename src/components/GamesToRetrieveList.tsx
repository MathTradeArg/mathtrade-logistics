"use client";

import type { Trade } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";

interface GamesToRetrieveListProps {
  trades: Trade[];
  volunteerId: number | null;
  onFinish: () => void;
}

const GamesToRetrieveList: React.FC<GamesToRetrieveListProps> = ({ trades, volunteerId, onFinish }) => {
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
      const response = await fetch(`${MT_API_HOST}logistics/games/bulk-update-status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          assigned_trade_codes: availableToDeliverTrades.map(trade => trade.result.assigned_trade_code),
          status: 6,
          change_by_id: volunteerId
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al marcar juegos como entregados.`);
      }
      setDeliverySuccess(`Juegos entregados a ${trades[0].to_member.first_name} ${trades[0].to_member.last_name}.`);
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
              <li
                key={`deliver-${trade.result.assigned_trade_code}`}
                className="flex rounded-xl shadow-md bg-white dark:bg-gray-700"
              >
                <div className="flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4 bg-accent-green/80 dark:bg-accent-green/70 rounded-l-xl">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {trade.result.assigned_trade_code}
                  </span>
                </div>
                <div className="flex-grow p-3 sm:p-4">
                  <span className="text-base sm:text-lg font-semibold leading-tight text-gray-800 dark:text-gray-100">
                    {trade.math_item_exchanged.title}
                  </span>
                </div>
              </li>
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
              <li
                key={`delivered-${trade.result.assigned_trade_code}`}
                className="flex rounded-xl shadow-sm bg-gray-100 dark:bg-gray-800 opacity-70"
              >
                <div className="flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4 bg-gray-400 dark:bg-gray-600 rounded-l-xl">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {trade.result.assigned_trade_code}
                  </span>
                </div>
                <div className="flex-grow p-3 sm:p-4">
                  <span className="text-base sm:text-lg font-medium leading-tight text-gray-500 dark:text-gray-400 line-through">
                    {trade.math_item_exchanged.title}
                  </span>
                </div>
                <div className="flex-shrink-0 px-3 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-500" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherStatusTrades.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Juegos aún no disponibles ({otherStatusTrades.length}):
          </h3>
          <ul className="space-y-3">
            {otherStatusTrades.map((trade) => (
              <li
                key={`delivered-${trade.result.assigned_trade_code}`}
                className="flex rounded-xl shadow-sm bg-gray-100 dark:bg-gray-800 opacity-70"
              >
                <div className="flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4 bg-gray-400 dark:bg-gray-600 rounded-l-xl">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {trade.result.assigned_trade_code}
                  </span>
                </div>
                <div className="flex-grow p-3 sm:p-4">
                  <span className="text-base sm:text-lg font-medium leading-tight text-gray-500 dark:text-gray-400 line-through">
                    {trade.math_item_exchanged.title}
                  </span>
                </div>
                <div className="flex-shrink-0 px-3 flex items-center justify-center">
                  <XCircle size={24} className="text-red-500" />
                </div>
              </li>
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
          className="w-full mt-8 px-6 py-3 bg-accent-green text-gray-800 font-semibold rounded-lg shadow-lg hover:opacity-85 transition-opacity duration-150 ease-in-out disabled:opacity-50"
        >
          {isLoadingDelivery ? "Procesando..." : `Entregar ${availableToDeliverTrades.length === 1 ? "Juego" : `${availableToDeliverTrades.length} Juegos`} a ${trades[0].to_member.first_name}`}
        </button>
      )}

      <button
        onClick={onFinish}
        className="w-full mt-10 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out"
      >
        {deliverySuccess ? 'Listo, escanear otro QR' : 'Volver / Escanear otro QR'}
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
