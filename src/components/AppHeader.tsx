"use client";

import { LayoutDashboard, LogOut, ArrowLeft } from 'lucide-react';

interface AppHeaderProps {
  userName: string | null;
  userRole: string | null;
  onLogoutClick: () => void;
  onPanelClick?: () => void; 
  showPanelButton?: boolean; 
  showBackButton?: boolean; 
  onBackClick?: () => void; 
}

const AppHeader: React.FC<AppHeaderProps> = ({ userName, userRole, onLogoutClick, onPanelClick, showPanelButton = true, showBackButton = false, onBackClick }) => {
  if (!userName) {
    return null; 
  }

  return (
    <header className="w-full max-w-5xl mb-8 sm:mb-12">
      <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center">
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
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300"> 
            Hola, <span className="font-bold text-secondary-blue dark:text-sky-400">{userName}!</span>
            {userRole && userRole !== 'USER' && (
              <span className="text-xs bg-accent-yellow text-gray-700 px-1.5 py-0.5 rounded-full ml-2 align-middle">{userRole}</span>
            )}
          </p>
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