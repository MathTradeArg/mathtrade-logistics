"use client";

import { GameDetail, GameStatusCode, GameStatusMap } from '@/types';
import { AlertCircle, CheckCircle2, Info, MapPin, Package, Tag, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui'; 

interface GameDetailsDisplayProps {
  gameDetail: GameDetail;
  isAdmin: boolean;
  isPerformingGameAction: boolean;
  actionsDisabledByPhase: boolean;
  gameActionSuccess: string | null;
  gameActionError: string | null;
  onGameAction: (gameId: number, newStatus: GameStatusCode) => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
  <div className="flex items-start text-sm">
    <Icon size={16} className="text-gray-500 dark:text-gray-400 mt-1 mr-3 flex-shrink-0" />
    <div className="flex-grow">
      <span className="font-semibold text-gray-800 dark:text-gray-200">{label}:</span>
      <span className="ml-2 text-gray-600 dark:text-gray-300">{value}</span>
    </div>
  </div>
);

export const GameDetailsDisplay: React.FC<GameDetailsDisplayProps> = ({
  gameDetail,
  isAdmin,
  isPerformingGameAction,
  actionsDisabledByPhase,
  gameActionSuccess,
  gameActionError,
  onGameAction,
}) => {
  const {
    assigned_trade_code,
    item_to,
    membership: owner,
    status,
    table_number,
    change_by,
  } = gameDetail;
  const { title } = item_to;

  const handleAction = (newStatus: GameStatusCode) => {
    if (window.confirm(`¿Seguro que quieres marcar este juego como "${GameStatusMap[newStatus]}"?`)) {
      onGameAction(assigned_trade_code, newStatus);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
      <div className="space-y-2">
        <DetailItem icon={Tag} label="ID" value={assigned_trade_code} />        
        <DetailItem icon={User} label="De" value={`${owner.first_name} ${owner.last_name}`} />
        <DetailItem icon={Package} label="Estado" value={GameStatusMap[status] || 'Desconocido'} />
        {table_number && <DetailItem icon={MapPin} label="Ubicación" value={table_number} />}
        {change_by && <DetailItem icon={Info} label="Último cambio por" value={`${change_by.first_name} ${change_by.last_name}`} />}
      </div>

      {isAdmin && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Acciones sobre el juego</h4>
          <div className="flex flex-wrap gap-2">
            {(status < 5 || (status === 6 && isAdmin)) && status !== 5 && (
              <button
                onClick={() => handleAction(5)}
                disabled={isPerformingGameAction || actionsDisabledByPhase || (status === 6 && !isAdmin)}
                className="px-3 py-1 text-xs font-medium text-white rounded bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Marcar como Recibido por Org.
              </button>
            )}

            {status < 6 && (
              <button
                onClick={() => handleAction(6)}
                disabled={isPerformingGameAction || actionsDisabledByPhase}
                className="px-3 py-1 text-xs font-medium text-white rounded bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                Marcar como Entregado a Usuario
              </button>
            )}

            {isAdmin && status > 4 && (
              <button
                onClick={() => handleAction(4)}
                disabled={isPerformingGameAction || actionsDisabledByPhase}
                className="px-3 py-1 text-xs font-medium text-white rounded bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed"
              >
                Marcar como En Viaje
              </button>
            )}
          </div>
          {isPerformingGameAction && <div className="flex items-center text-sm text-gray-500 mt-2"><LoadingSpinner/> <span className="ml-2">Procesando...</span></div>}
          {gameActionSuccess && <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center"><CheckCircle2 size={16} className="mr-1" /> {gameActionSuccess}</p>}
          {gameActionError && <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center"><AlertCircle size={16} className="mr-1" /> {gameActionError}</p>}
        </div>
      )}
    </div>
  );
};
