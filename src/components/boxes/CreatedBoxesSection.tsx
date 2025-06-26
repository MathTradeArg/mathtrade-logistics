import { LoadingSpinner } from '@/components/ui';
import type { Box } from '@/types/logistics';
import React from 'react';
import SimpleBoxDisplayCard from './SimpleBoxDisplayCard';
interface CreatedBoxesSectionProps {
  createdBoxes: Box[];
  isLoadingCreated: boolean;
  errorCreated: string | null;
}



const CreatedBoxesSection: React.FC<CreatedBoxesSectionProps> = ({
  createdBoxes,
  isLoadingCreated,
  errorCreated,
}) => {
  return (
    <section className="w-full mb-8 pt-2">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Listado de Cajas Creadas
      </h3>

      {isLoadingCreated && <LoadingSpinner message="Cargando cajas creadas..." />}

      {!isLoadingCreated && (
        <>
          {errorCreated && <p className="text-red-500 dark:text-red-400">{errorCreated}</p>}
          {!errorCreated && createdBoxes.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No hay cajas creadas para mostrar.</p>
          )}
          {!errorCreated && createdBoxes.length > 0 && (
            <div className={createdBoxes.length > 1 ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex justify-center"}>
              {createdBoxes.map(box => (
                <div key={`${box.origin}-${box.id}`} className={createdBoxes.length > 1 ? "" : "w-full max-w-md"}>
                  <SimpleBoxDisplayCard box={box} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CreatedBoxesSection;
