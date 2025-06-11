"use client";

import type { User, Item, Game } from '@/types'; 

interface GameListProps {
  user: User; 
  onUpdateItem: (itemId: number, newDeliveredState: boolean) => Promise<void>;
  onFinish: () => void;
}

const GameList: React.FC<GameListProps> = ({ user, onUpdateItem, onFinish }) => {
  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-1 text-center text-gray-800">
        {user.first_name} {user.last_name}
      </h2>
      <p className="text-sm text-gray-500 mb-6 text-center">ID de Usuario: {user.id}</p>

      {user.items.length === 0 ? (
        <p className="text-center text-gray-600 my-4">Este usuario no tiene ítems asignados.</p>
      ) : (
      <ul className="space-y-3">
        {user.items.map((item: Item) => (
          <li 
            key={item.id} 
            className="flex flex-col sm:flex-row justify-between items-center p-4 border border-gray-300 rounded-lg shadow-sm bg-white"
          >
            <div className="flex-grow mb-2 sm:mb-0">
              <span className="text-lg font-semibold text-blue-700">{item.title}</span>
              {item.elements.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-gray-500">Juegos incluidos:</p>
                  <ul className="list-disc list-inside ml-4 text-sm text-gray-600">
                    {item.elements.map((game: Game) => (
                      <li key={game.id}>{game.primary_name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                if (!item.delivered) { 
                  onUpdateItem(item.id, true); 
                }
              }}
              disabled={item.delivered} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto mt-2 sm:mt-0
                          ${item.delivered 
                            ? 'bg-green-600 text-white cursor-not-allowed'  
                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
            >
              {item.delivered ? '✅ Entregado' : 'Marcar como Entregado'}
            </button>
          </li>
        ))}
      </ul>
      )}
      <button 
        onClick={onFinish} 
        className="w-full mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
      >
        Terminar y escanear otro QR
      </button>
    </div>
  );
};

export default GameList;