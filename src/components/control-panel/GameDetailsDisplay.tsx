"use client";

import { GameDetail, GameStatusCode, GameStatusMap } from '@/types';
import { WarningCircle, CheckCircle, Info, MapPin, Package, Tag, User } from 'phosphor-react';
import { LoadingSpinner } from '@/components/common/ui'; 
import { useHapticClick } from '@/hooks/useHapticClick'; 

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
    member_to,
    status,
    table_number,
    change_by,
  } = gameDetail;
  const { title } = item_to;

  const handleAction = useHapticClick((newStatus: GameStatusCode) => {
    if (window.confirm(`¿Seguro que quieres marcar este juego como "${GameStatusMap[newStatus]}"?`)) {
      onGameAction(assigned_trade_code, newStatus);
    }
  });

  return (
    <div className="space-y-4 pt-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
      <div className="space-y-2">
        <DetailItem icon={Tag} label="ID" value={assigned_trade_code} />        
        <DetailItem icon={User} label="De" value={`${owner.first_name} ${owner.last_name}`} />
        <DetailItem icon={User} label="A" value={`${member_to.first_name} ${member_to.last_name}`} />
        <DetailItem icon={Package} label="Estado" value={GameStatusMap[status] || 'Desconocido'} />
        {table_number && <DetailItem icon={MapPin} label="Destino" value={table_number} />}
        {change_by && <DetailItem icon={Info} label="Último cambio por" value={`${change_by.first_name} ${change_by.last_name}`} />}
      </div>

      {isAdmin && (() => {
        const showEvento = (status < 5 || (status === 6 && isAdmin)) && status !== 5;
        const showEntregado = status < 6;
        const showPendiente = isAdmin && status > 4;
        if (!showEvento && !showEntregado && !showPendiente) return null;
        return (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mb-6">
            <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Cambiar estado de juego</h4>
            <div className="flex flex-wrap gap-2">
              {showEvento && (
                  <button
                    onClick={() => handleAction(5)}
                    disabled={isPerformingGameAction || actionsDisabledByPhase || (status === 6 && !isAdmin)}
                    className="nm-btn-primary text-xs px-2 py-1 min-h-0 h-8 flex items-center justify-center leading-tight max-w-[120px] whitespace-normal text-center"
                    style={{lineHeight: '1.1', fontSize: '12px', padding: '0 8px', height: '2.1rem'}}>
                    En evento
                  </button>
              )}
              {showEntregado && (
                  <button
                    onClick={() => handleAction(6)}
                    disabled={isPerformingGameAction || actionsDisabledByPhase}
                    className="nm-btn-secondary text-xs px-2 py-1 min-h-0 h-8 flex items-center justify-center leading-tight max-w-[120px] whitespace-normal text-center"
                    style={{lineHeight: '1.1', fontSize: '12px', padding: '0 8px', height: '2.1rem'}}>
                    Entregado
                  </button>
              )}
              {showPendiente && (
                  <button
                    onClick={() => handleAction(4)}
                    disabled={isPerformingGameAction || actionsDisabledByPhase}
                    className="nm-btn-warning text-xs px-2 py-1 min-h-0 h-8 flex items-center justify-center leading-tight max-w-[120px] whitespace-normal text-center"
                    style={{lineHeight: '1.1', fontSize: '12px', padding: '0 8px', height: '2.1rem'}}>
                    Pendiente
                  </button>
              )}
            </div>
            {isPerformingGameAction && <div className="flex items-center text-sm text-gray-500 mt-2"><LoadingSpinner/> <span className="ml-2">Procesando...</span></div>}
            {gameActionSuccess && <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center"><CheckCircle size={16} className="mr-1" /> {gameActionSuccess}</p>}
            {gameActionError && <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center"><WarningCircle size={16} className="mr-1" /> {gameActionError}</p>}
          </div>
        );
      })()}
    </div>
  );
};
