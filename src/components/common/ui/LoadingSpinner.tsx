"use client";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Cargando..." }) => {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center text-center sm:min-h-[300px]" data-testid="loading-spinner">
      <div className="mb-4 flex items-center justify-center rounded-full bg-white p-3 sm:mb-6">
        <div className="relative flex h-12 w-12 items-center justify-center sm:h-16 sm:w-16">
          <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#d4d4d8" strokeWidth="5" opacity="0.5" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeDasharray="100 60" />
          </svg>
        </div>
      </div>
      <p className="text-lg font-semibold text-gray-700 sm:text-xl">{message}</p>
    </div>
  );
};

export { LoadingSpinner };
