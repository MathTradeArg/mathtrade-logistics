import { AlertCircle, X } from 'lucide-react';
import React from 'react';

interface NonPackableDestination {
  id: number;
  name: string;
}

interface NonPackableDestinationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: {
    fullyPacked: NonPackableDestination[];
    notReady: NonPackableDestination[];
  };
}

const NonPackableDestinationsModal: React.FC<NonPackableDestinationsModalProps> = ({
  isOpen,
  onClose,
  destinations,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-blue dark:text-sky-400 flex items-center">
            <AlertCircle size={24} className="mr-2 text-accent-yellow" />
            Destinos no empaquetables
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 ease-in-out active:scale-90">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-4">
          {destinations.fullyPacked.length === 0 && destinations.notReady.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              ¡Excelente! Todos los destinos tienen al menos un ítem listo para empaquetar.
            </p>
          ) : (
            <div className="space-y-6">
              {destinations.fullyPacked.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-600 dark:text-gray-300 mb-2 border-b border-gray-200 dark:border-gray-600 pb-1">
                    Todos los ítems ya están en cajas
                  </h3>
                  <ul className="space-y-2 pt-2">
                    {destinations.fullyPacked.map((dest) => (
                      <li key={dest.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{dest.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {destinations.notReady.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-600 dark:text-gray-300 mb-2 border-b border-gray-200 dark:border-gray-600 pb-1">
                    Ningún ítem está listo para empaquetar
                  </h3>
                  <ul className="space-y-2 pt-2">
                    {destinations.notReady.map((dest) => (
                      <li key={dest.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{dest.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-secondary-blue hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default NonPackableDestinationsModal;