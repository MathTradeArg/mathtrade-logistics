"use client";
import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { X, Check, XCircle } from 'lucide-react'; 
import Link from 'next/link'; 
import { GameDetail, GameStatusCode, GameStatusMap, User } from '@/types';


interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: (actionWasSuccessful?: boolean) => void; 
  isAdmin: boolean;
  loggedInUserId: number | null;
  loggedInUserName: string | null;
}

const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose, isAdmin, loggedInUserId, loggedInUserName }) => {
  const [searchId, setSearchId] = useState('');
  const [gameDetail, setGameDetails] = useState<GameDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [hasAnyActionSucceededThisSession, setHasAnyActionSucceededThisSession] = useState(false);
  const { isHighContrast, toggleHighContrast } = useAuth();


  useEffect(() => {
    if (isOpen) {
      setHasAnyActionSucceededThisSession(false);
    }
  }, [isOpen]);

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
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/game/${searchId}/detail/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Juego con id ${searchId} no encontrado.`);
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${response.status} al buscar el juego.`);
      }
      const data: GameDetail = await response.json();
      setGameDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al buscar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameAction = async (gameId: number, newStatus: GameStatusCode ) => {
    setIsLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/games/bulk-update-status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          assigned_trade_codes: [gameId],
          status: newStatus,
          change_by_id: loggedInUserId
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${response.status} al actualizar estado.`);
      }
      
      setGameDetails(prev => {
        if (!prev) return null;
        const updatedDetails = { ...prev, status: newStatus };
        if (newStatus === 6 && loggedInUserId && loggedInUserName) {
          if (!updatedDetails.change_by) {
            updatedDetails.change_by = {} as User; 
          }
          updatedDetails.change_by.id = loggedInUserId;
          const spaceIndex = loggedInUserName.indexOf(' ');
          updatedDetails.change_by.first_name = spaceIndex > -1 ? loggedInUserName.slice(0, spaceIndex) : loggedInUserName;
          updatedDetails.change_by.last_name = spaceIndex > -1 ? loggedInUserName.slice(spaceIndex + 1) : '';

        }
        return updatedDetails;
      });      
      setActionSuccess(`Juego ${gameId} actualizado a: ${GameStatusMap[newStatus]}.`);
      setHasAnyActionSucceededThisSession(true);

    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al realizar la acción.");
    } finally {
      setIsLoading(false);
    }
  };

  const canDecreaseStatus = isAdmin == true;
  const currentStatusText = gameDetail ? GameStatusMap[gameDetail.status] || "Desconocido" : "";

  const handleModalClose = () => {
    onClose(hasAnyActionSucceededThisSession); 
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-blue dark:text-sky-400">Panel de Control</h2>
          <button onClick={handleModalClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 ease-in-out active:scale-90">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="border-t dark:border-gray-700 mt-4 pt-4 mb-4">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Preferencias de Visualización</h3>
        <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
          <span className="text-gray-700 dark:text-gray-300">Modo Alto Contraste</span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isHighContrast}
              onChange={toggleHighContrast}
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white dark:after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-blue dark:peer-checked:bg-sky-500"></div>
          </div>
        </label>
      </div>

        {isAdmin == true && (
          <div className="mb-4 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Vistas de Admin</h3>
            <Link href="/admin/ready-to-pickup" passHref>
              <div onClick={handleModalClose} className="block w-full text-left px-4 py-2 text-sm text-secondary-blue hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors duration-150 ease-in-out">
                Ver Usuarios Listos para Retirar
              </div>
            </Link>
          </div>
        )}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="number"
            inputMode="numeric" 
            pattern="[0-9]*"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))} 
            placeholder="ID del Juego"
            className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-blue focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-secondary-blue text-white font-semibold rounded-md shadow-sm hover:opacity-85 disabled:opacity-50 transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100"
          >
            {isLoading && !gameDetail ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && <p className="text-sm text-red-500 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</p>}

        <div className="overflow-y-auto flex-grow">
          {gameDetail && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p><strong>ID:</strong> {gameDetail.assigned_trade_code}</p>
              <p><strong>Título:</strong> {gameDetail.item_to.title}</p>
              {gameDetail.table_number && (
                <p><strong>Ubicación:</strong> {gameDetail.table_number}</p>
              )}
              <p><strong>Estado:</strong> <span className={`font-semibold ${
                  gameDetail.status === 6 ? 'text-accent-green' : 
                  gameDetail.status === 5 ? 'text-blue-500' : 
                  'text-accent-yellow'
                }`}>
                {currentStatusText}
              </span></p>
              {gameDetail.status === 6 && gameDetail.member_to && gameDetail.member_to.first_name && gameDetail.member_to.last_name && (
                <p><strong>Recibido por:</strong> {gameDetail.member_to.first_name} {gameDetail.member_to.last_name}</p>
              )}
              {gameDetail.change_by && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Último cambio por: {gameDetail.change_by.first_name} {gameDetail.change_by.last_name} (ID: {gameDetail.change_by.id})</p>
              )}

              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2"> 
                  {gameDetail.status < 5 && (
                    <>
                      <button
                        onClick={() => handleGameAction(gameDetail.assigned_trade_code, 5)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md shadow-sm hover:bg-blue-600 disabled:opacity-50 transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100"
                      >
                        {isLoading ? 'Procesando...' : 'A "Recibido por Org."'}
                      </button>
                      <button
                        onClick={() => handleGameAction(gameDetail.assigned_trade_code, 6)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-accent-green text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100"
                      >
                        {isLoading ? 'Procesando...' : 'A "Entregado a Usuario"'}
                      </button>
                    </>
                  )}
                  {gameDetail.status === 5 && (
                    <>
                       <button
                        onClick={() => handleGameAction(gameDetail.assigned_trade_code, 4)}
                        disabled={isLoading || !canDecreaseStatus}
                        className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100 ${canDecreaseStatus ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
                        title={!canDecreaseStatus ? "Solo administradores pueden retroceder estados" : ""}
                      >
                        {isLoading ? 'Procesando...' : 'A "Pendiente"'}
                      </button>
                      <button
                        onClick={() => handleGameAction(gameDetail.assigned_trade_code, 6)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-accent-green text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100"
                      >
                        {isLoading ? 'Procesando...' : 'A "Entregado a Usuario"'}
                      </button>
                    </>
                  )}
                  {gameDetail.status === 6 && (
                    <>
                      <button
                        onClick={() => handleGameAction(gameDetail.assigned_trade_code, 4)}
                        disabled={isLoading || !canDecreaseStatus}
                        className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100 ${canDecreaseStatus ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
                        title={!canDecreaseStatus ? "Solo administradores pueden retroceder estados" : ""}
                      >
                        {isLoading ? 'Procesando...' : 'A "Pendiente"'}
                      </button>
                    <button
                      onClick={() => handleGameAction(gameDetail.assigned_trade_code, 5)}
                      disabled={isLoading || !canDecreaseStatus}
                      className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-all duration-150 ease-in-out active:scale-95 disabled:active:scale-100 ${canDecreaseStatus ? 'bg-accent-yellow text-gray-800 hover:opacity-85' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
                      title={!canDecreaseStatus ? "Solo administradores pueden retroceder estados" : ""}
                    >
                      {isLoading ? 'Procesando...' : 'A "Recibido por Org."'}
                    </button>
                  </>
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
