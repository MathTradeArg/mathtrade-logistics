import React from 'react';
import { useHapticClick } from '@/hooks/useHapticClick';

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
  const handleClose = useHapticClick(onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 glass-bg">
      <div className="nm-surface dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-center items-center mb-4">
          <h2 className="text-xl font-bold flex items-center nm-text-shadow text-secondary-blue dark:text-sky-100 nm-surface px-4 py-2 rounded-lg shadow-md">
            Destinos no empaquetables
          </h2>
        </div>

        <div className="overflow-y-auto flex-grow p-6 mb-4">
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
                      <li key={dest.id} className="p-3 mb-4 nm-surface">
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
                      <li key={dest.id} className="p-3 mb-4 nm-surface">
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
          onClick={handleClose}
          className="w-full nm-btn-secondary"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default NonPackableDestinationsModal;