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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(213,220,226,0.7)] p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 text-gray-900">
        <div className="mb-4 flex items-center justify-center">
          <h2 className="text-xl font-bold">
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
                      <li key={dest.id} className="mb-3 rounded-lg border border-gray-200 bg-page p-3">
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
                      <li key={dest.id} className="mb-3 rounded-lg border border-gray-200 bg-page p-3">
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
          className="flex min-h-14 w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-base font-semibold text-gray-800"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default NonPackableDestinationsModal;