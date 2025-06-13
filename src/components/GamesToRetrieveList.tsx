"use client";

import { useState } from "react";
import type { Item } from "@/types";
import ConfirmationModal from "./ConfirmationModal";

interface UserRetrievingGames {
  id: number | string;
  first_name: string;
  last_name: string;
  games_to_retrieve: Pick<Item, 'id' | 'title'>[];
}

interface GamesToRetrieveListProps {
  user: UserRetrievingGames;
  volunteerId: number | null;
  userRole: string | null;
  onFinish: () => void;
}

const GamesToRetrieveList: React.FC<GamesToRetrieveListProps> = ({ user, volunteerId, userRole, onFinish }) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);

  const handleOpenConfirmModal = () => {
    if (user.games_to_retrieve.length > 0) {
      setIsConfirmModalOpen(true);
    }
  };

  const executeDeliveryToUser = async () => {
    setIsLoadingDelivery(true);
    setDeliveryError(null);
    setDeliverySuccess(null);
    try {
      const response = await fetch(`/api/games/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: user.games_to_retrieve.map(game => game.id),
          status: 'delivered',
          deliveredByUserId: volunteerId,
          userRole: userRole
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al entregar juegos al usuario.`);
      }
      setDeliverySuccess(`Juegos entregados a ${user.first_name} ${user.last_name}.`);
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
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID Usuario: {user.id}</p>
        <p className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-200">
          Juegos a Retirar:
        </p>
      </div>

      {user.games_to_retrieve.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400 my-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          Este usuario no tiene juegos pendientes de retirar.
        </p>
      ) : (
        <ul className="space-y-3">
          {user.games_to_retrieve.map((game) => (
            <li
              key={game.id}
              className="flex items-center p-3 sm:p-4 rounded-xl shadow-md bg-gray-50 dark:bg-gray-700/50"
            >
              <div className="flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4 bg-secondary-blue/80 dark:bg-secondary-blue/60 rounded-l-xl">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {game.id}
                </span>
              </div>
              <div className="flex-grow p-3 sm:p-4">
                <span className="text-base sm:text-lg font-semibold leading-tight text-secondary-blue dark:text-sky-400">
                  {game.title}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deliveryError && <p className="text-sm text-red-500 dark:text-red-400 mt-4 text-center">{deliveryError}</p>}
      {deliverySuccess && <p className="text-sm text-green-600 dark:text-green-400 mt-4 text-center">{deliverySuccess}</p>}

      {user.games_to_retrieve.length > 0 && !deliverySuccess && ( 
        <button
          onClick={handleOpenConfirmModal}
          disabled={isLoadingDelivery}
          className="w-full mt-8 px-6 py-3 bg-accent-green text-gray-800 font-semibold rounded-lg shadow-lg hover:opacity-85 transition-opacity duration-150 ease-in-out disabled:opacity-50"
        >
          {isLoadingDelivery ? "Procesando..." : `Entregar ${user.games_to_retrieve.length === 1 ? "Juego" : "Juegos"} a ${user.first_name}`}
        </button>
      )}

      <button
        onClick={onFinish}
        className="w-full mt-10 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out"
      >
        Listo, escanear otro QR
      </button>

      {isConfirmModalOpen && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={executeDeliveryToUser}
          itemsToDeliver={user.games_to_retrieve.map(g => ({ ...g, delivered: false, elements: [] }))} // Adaptar a la interfaz Item
          actionType="all" // O un nuevo tipo si es necesario, pero 'all' funciona para el botón
          modalTitle={`Confirmar Entrega a ${user.first_name}`}
        />
      )}
    </div>
  );
};

export default GamesToRetrieveList;
