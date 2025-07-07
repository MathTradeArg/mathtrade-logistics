"use client";

import '@/styles/glassmorphism.css';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Cargando..." }) => {
  return (
    <div className="flex flex-col justify-center items-center min-h-[200px] sm:min-h-[300px] text-center" data-testid="loading-spinner">
      <div className="glass-bg shadow-lg flex items-center justify-center rounded-full mb-4 sm:mb-6 p-3">
        <div className="w-12 h-12 sm:w-16 sm:h-16 relative flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#b3e5fc" strokeWidth="5" opacity="0.25" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#00bcd4" strokeWidth="5" strokeLinecap="round" strokeDasharray="100 60" />
          </svg>
        </div>
      </div>
      <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 neumorphism-text-shadow">{message}</p>
    </div>
  );
};

export { LoadingSpinner };
