"use client";

import { useState, FormEvent } from 'react';
import { X, Check, XCircle } from 'lucide-react'; 
import Link from 'next/link'; 
import { GameDetails } from '@/types';


interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  loggedInUserId: number | null;
  loggedInUserName: string | null;
}

const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose, userRole, loggedInUserId, loggedInUserName }) => {
  const [searchId, setSearchId] = useState('');
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) {
      setError("Por favor, ingresá el id de un juego.");
      return;
    }
    setIsLoading(true);
    setError('');
    setGameDetails(null);
    setActionError('');
    setActionSuccess('');

    try {
      const response = await fetch(`/api/game/${searchId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Juego con id ${searchId} no encontrado.`);
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${response.status} al buscar el juego.`);
      }
      const data: GameDetails = await response.json();
      setGameDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al buscar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameAction = async (gameId: number, newStatus: 'delivered' | 'pending') => {
    setIsLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await fetch('/api/games/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [gameId],
          status: newStatus,
          deliveredByUserId: loggedInUserId,
          userRole: userRole
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${response.status} al actualizar estado.`);
      }
      
      setGameDetails(prev => {
        if (!prev) return null;
        const updatedDetails = { ...prev, status: newStatus };
        if (newStatus === 'delivered') {
          updatedDetails.delivered_to_user_id = loggedInUserId;
          updatedDetails.delivered_to_user_name = loggedInUserName;
        }
        return updatedDetails;
      });
      setActionSuccess(`Juego ${gameId} ${newStatus === 'delivered' ? 'entregado' : 'no entregado'}.`);

    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al realizar la acción.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-blue dark:text-sky-400">Panel de Control</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {userRole === 'ADMIN' && (
          <div className="mb-4 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Vistas de Admin</h3>
            <Link href="/admin/ready-to-pickup" passHref>
              <div onClick={onClose} className="block w-full text-left px-4 py-2 text-sm text-secondary-blue hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer">
                Ver Usuarios Listos para Retirar
              </div>
            </Link>
          </div>
        )}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="number"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))} 
            placeholder="ID del Juego"
            className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-blue focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-secondary-blue text-white font-semibold rounded-md shadow-sm hover:opacity-85 disabled:opacity-50"
          >
            {isLoading && !gameDetails ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && <p className="text-sm text-red-500 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</p>}
        
        <div className="overflow-y-auto flex-grow">
          {gameDetails && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p><strong>ID:</strong> {gameDetails.id}</p>
              <p><strong>Título:</strong> {gameDetails.title}</p>
              <p><strong>Estado:</strong> <span className={gameDetails.status === 'delivered' ? 'text-accent-green font-semibold' : 'text-accent-yellow font-semibold'}>
                {gameDetails.status === 'delivered' ? 'Entregado' : 'No Entregado'}
              </span></p>
              {gameDetails.status === 'delivered' && gameDetails.delivered_to_user_name && (
                <p><strong>Recibido por:</strong> {gameDetails.delivered_to_user_name} (ID: {gameDetails.delivered_to_user_id})</p>
              )}

              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2"> 
                  {gameDetails.status === 'pending' && (
                    <button
                      onClick={() => handleGameAction(gameDetails.id, 'delivered')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-secondary-blue text-white font-semibold rounded-md shadow-sm hover:opacity-85 disabled:opacity-50"
                    >
                      {isLoading ? 'Procesando...' : 'Marcar como Entregado'}
                    </button>
                  )}
                  {userRole === 'ADMIN' && gameDetails.status === 'delivered' && (
                    <button
                      onClick={() => handleGameAction(gameDetails.id, 'pending')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-accent-yellow text-gray-800 font-semibold rounded-md shadow-sm hover:opacity-85 disabled:opacity-50"
                    >
                      {isLoading ? 'Procesando...' : 'Marcar como NO Entregado (Admin)'}
                    </button>
                  )}
                </div>
                {actionSuccess && !isLoading && (
                  <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
                    <Check size={18} className="mr-1.5 flex-shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}
                {actionError && !isLoading && (
                  <div className="mt-3 flex items-center text-sm text-red-500 dark:text-red-400">
                    <XCircle size={18} className="mr-1.5 flex-shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanelModal;
