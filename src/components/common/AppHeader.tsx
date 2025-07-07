
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, CaretDown, Crown, SignOut, Moon, MagnifyingGlass, Sun, User, X } from 'phosphor-react';
import { useRouter } from 'next/navigation';
import React, { ComponentType, FormEvent, useState } from 'react';
import { LoadingSpinner } from '@/components/common/ui/LoadingSpinner';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useHapticClick } from '@/hooks/useHapticClick';  

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
  const [isMagnifyingGlassVisible, setIsMagnifyingGlassVisible] = useState(false);
  const [MagnifyingGlassValue, setMagnifyingGlassValue] = useState('');

  const handleBack = useHapticClick(onBackClick ?? (() => router.push('/')));
  const handleToggleMagnifyingGlass = useHapticClick(() => setIsMagnifyingGlassVisible(!isMagnifyingGlassVisible));
  const handleToggleDarkMode = useHapticClick(toggleDarkMode);
  const handleToggleMenu = useHapticClick(() => setIsMenuOpen(!isMenuOpen));
  const handleOpenPanel = useHapticClick(() => {
    openPanel();
    setIsMenuOpen(false);
  });
  const handleLogout = useHapticClick(() => {
    logout();
    setIsMenuOpen(false);
  });

  const handleMagnifyingGlassSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (MagnifyingGlassValue.trim()) {
      openPanel(MagnifyingGlassValue.trim());
      setMagnifyingGlassValue('');
      setIsMagnifyingGlassVisible(false);
    }
  };

  if (!userName) {
    return null;
  }

  return (
    <header className="w-full nm-surface nm-surface-no-top-radius dark:bg-gray-800 shadow-md p-4 flex flex-wrap md:flex-nowrap justify-between items-center sticky top-0 z-50 overflow-x-hidden">
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-hidden">
        {!isMagnifyingGlassVisible && (
          <>
            {showBackButton && (
              <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Volver a la página anterior">
                <ArrowLeft size={24} />
              </button>
            )}
            {pageIcon && React.createElement(pageIcon, { size: 28, className: "text-gray-700 dark:text-gray-300" })}
            {pageTitle && (
              <h1
                className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 truncate max-w-[40vw] md:max-w-[28vw] lg:max-w-[22vw]"
                title={pageTitle}
              >
                {pageTitle}
              </h1>
            )}
          </>
        )}
        {isMagnifyingGlassVisible && (
          <form onSubmit={handleMagnifyingGlassSubmit} className="flex items-center w-full">
            <div className="relative w-full nm-input-with-icon">
              <div className="search-icon-container">
                <MagnifyingGlass size={20} className="text-gray-500" />
              </div>
              <input
                type="number"
                autoFocus
                value={MagnifyingGlassValue}
                onChange={(e) => setMagnifyingGlassValue(e.target.value)}
                placeholder="Buscar juego por ID..."
                className="w-full bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 pr-4 py-3"
              />
            </div>
          </form>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
        {!isMagnifyingGlassVisible && !isLoadingEventPhase && eventPhaseDisplay && (
          <div className="hidden md:block px-3 py-1.5 bg-secondary-blue/10 dark:bg-sky-400/20 text-secondary-blue dark:text-sky-300 rounded-full text-sm font-semibold">
            {eventPhaseDisplay}
          </div>
        )}

        <button onClick={handleToggleMagnifyingGlass} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={isMagnifyingGlassVisible ? "Cerrar búsqueda" : "Abrir búsqueda"}>
          {isMagnifyingGlassVisible ? <X size={20} /> : <MagnifyingGlass size={20} />}
        </button>

        {!isMagnifyingGlassVisible && (
          <>
        <button onClick={handleToggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div>
          <button onClick={handleToggleMenu} className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <User size={20} />
            <span className="hidden md:inline font-semibold">{userName}</span>
            {isAdmin && (
              <span className="p-1 bg-yellow-400 rounded-full" title="Administrador">
                <Crown size={12} className="text-gray-800" />
              </span>
            )}
            <CaretDown size={16} className={`transition-transform ml-1 md:ml-2 ${isMenuOpen ? 'rotate-180' : ''}`} style={{ marginRight: 2 }} />
          </button>
          {isMenuOpen && (
            <div className="fixed top-16 right-4 w-48 nm-surface dark:bg-gray-700 rounded-md shadow-lg py-1 z-[9999] border border-gray-200 dark:border-none animate-fade-in">
              {isAdmin && (
                <button
                  onClick={handleOpenPanel}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Panel de Control
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <SignOut size={16} />
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