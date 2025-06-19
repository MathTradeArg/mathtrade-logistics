import React from 'react';
import type { Box } from '../types/logistics';
import GameRowItem from './GameRowItem';

interface SimpleBoxDisplayCardProps {
  box: Box;
}

const SimpleBoxDisplayCard: React.FC<SimpleBoxDisplayCardProps> = ({ box }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-secondary-blue dark:text-sky-400">
          {box.number !== null ? `Caja #${box.number}` : 'Caja sin número'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Origen: <span className="font-semibold">{box.origin_name || 'Desconocido'}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Destino: <span className="font-semibold">{box.destination_name || 'Desconocido'}</span>
        </p>
      </div>
      <div className="p-4">
        <h5 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Ítems ({box.math_items.length})
        </h5>
        {box.math_items.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Esta caja no contiene ítems.</p>
        ) : (
          <ul className="space-y-2">
            {box.math_items.map(item => (
              <GameRowItem
                key={item.assigned_trade_code}
                id={item.assigned_trade_code}
                title={item.title}
                variant="default" 
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SimpleBoxDisplayCard;
