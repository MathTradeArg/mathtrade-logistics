"use client";

import { LayoutDashboard, LogOut, ArrowLeft } from 'lucide-react';

interface AppHeaderProps {
  userName: string | null;
  isAdmin: boolean;
  onLogoutClick: () => void;
  onPanelClick?: () => void;
  showPanelButton?: boolean;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ userName, isAdmin, onLogoutClick, onPanelClick, showPanelButton = true, showBackButton = false, onBackClick }) => {
  if (!userName) {
    return null;
  }

  const firstName = userName?.split(' ')[0];

  return (
    <header className="w-full sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-5xl mx-auto flex justify-between items-center p-4">
        <div className="flex items-center min-w-0">
          <div className="w-10 h-10 flex items-center justify-center mr-2">
            {showBackButton && onBackClick && (
              <button
                aria-label="Atrás"
                onClick={onBackClick}
                className="p-2 text-gray-500 hover:text-secondary-blue dark:text-gray-400 dark:hover:text-sky-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>
          <div className="flex items-baseline min-w-0">
            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-nowrap">Hola,&nbsp;</span>
            <span className="text-sm sm:text-base font-bold text-secondary-blue dark:text-sky-400 truncate" title={firstName || ''}>{firstName}</span>
            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-nowrap">!</span>
            {isAdmin && (
              <span className="ml-2 text-xs bg-accent-yellow text-gray-700 px-1.5 py-0.5 rounded-full align-middle whitespace-nowrap flex-shrink-0">ADMIN</span>

            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {showPanelButton && onPanelClick && (
            <button
              aria-label="Panel de Control"
              onClick={onPanelClick}
              className="p-2 text-gray-500 hover:text-secondary-blue dark:text-gray-400 dark:hover:text-sky-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LayoutDashboard size={20} />
            </button>
          )}
          <button
            aria-label="Salir"
            onClick={onLogoutClick}
            className="p-2 text-gray-500 hover:text-secondary-blue dark:text-gray-400 dark:hover:text-sky-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;