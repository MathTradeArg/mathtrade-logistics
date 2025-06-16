"use client";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Cargando..." }) => {
  return (
    <div className="flex flex-col justify-center items-center min-h-[200px] sm:min-h-[300px] text-center">
      <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 sm:border-[5px] border-secondary-blue dark:border-sky-500 border-t-transparent rounded-full animate-spin mb-4 sm:mb-6"></div>
      <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
