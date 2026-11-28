"use client";

import { DiceLoader } from "./DiceLoader";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Cargando..." }) => {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center text-center sm:min-h-[300px]" data-testid="loading-spinner">
      <div className="mb-4 flex items-center justify-center rounded-full bg-white p-3 sm:mb-6">
        <div className="relative flex h-12 w-12 items-center justify-center sm:h-16 sm:w-16">
          <DiceLoader />
        </div>
      </div>
      <p className="text-heading font-semibold text-gray-700">{message}</p>
    </div>
  );
};

export { LoadingSpinner };
