"use client";

import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, ChevronDown, Crown, LogOut, Moon, Search, Sun, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { ComponentType, FormEvent, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useControlPanel } from '@/contexts/ControlPanelContext';

interface AppHeaderProps {
  pageTitle?: string;
  pageIcon?: ComponentType<{ size?: number; className?: string }>;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  pageTitle,
  pageIcon,
  showBackButton = false,
  onBackClick,
}) => {
  const { userName, isAdmin, logout, isDarkMode, toggleDarkMode } = useAuth();
  const { eventPhaseDisplay, isLoadingEventPhase } = useEventPhase();
  const { openPanel } = useControlPanel();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleBack = onBackClick ?? (() => router.push('/'));

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      openPanel(searchValue.trim());
      setSearchValue('');
      setIsSearchVisible(false);
    }
  };

  if (!userName) {
    return null;
  }

  return (
    <header className="w-full bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {!isSearchVisible && (
          <>
            {showBackButton && (
              <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            {pageIcon && React.createElement(pageIcon, { size: 28, className: "text-gray-700 dark:text-gray-300" })}
            {pageTitle && <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">{pageTitle}</h1>}
          </>
        )}
        {isSearchVisible && (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full">
            <Search size={20} className="text-gray-500" />
            <input
              type="number"
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar juego por ID..."
              className="w-full bg-transparent focus:outline-none text-gray-800 dark:text-gray-200"
            />
          </form>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isSearchVisible && (isLoadingEventPhase ? (
          <LoadingSpinner />
        ) : (
          eventPhaseDisplay && (
            <div className="hidden sm:block px-3 py-1.5 bg-secondary-blue/10 dark:bg-sky-400/20 text-secondary-blue dark:text-sky-300 rounded-full text-sm font-semibold">
              {eventPhaseDisplay}
            </div>
          )
        ))}

        <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          {isSearchVisible ? <X size={20} /> : <Search size={20} />}
        </button>

        {!isSearchVisible && (
          <>
        <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <User size={20} />
            <span className="hidden md:inline font-semibold">{userName}</span>
            {isAdmin && (
              <span className="p-1 bg-yellow-400 rounded-full" title="Administrador">
                <Crown size={12} className="text-gray-800" />
              </span>
            )}
            <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-600">
              {isAdmin && (
                <button
                  onClick={() => {
                    openPanel();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Panel de Control
                </button>
              )}
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </header>
  );
};

export default AppHeader;