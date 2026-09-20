
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Crown, DotsThreeVertical, MagnifyingGlass, SignOut, X } from 'phosphor-react';
import { useRouter } from 'next/navigation';
import React, { ComponentType, FormEvent, useState } from 'react';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useHapticClick } from '@/hooks/useHapticClick';
import NotificationsBell from './NotificationsBell';

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
  const { userName, isAdmin, logout } = useAuth();
  const { openPanel } = useControlPanel();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMagnifyingGlassVisible, setIsMagnifyingGlassVisible] = useState(false);
  const [MagnifyingGlassValue, setMagnifyingGlassValue] = useState('');

  const handleBack = useHapticClick(onBackClick ?? (() => router.back()));
  const handleToggleMagnifyingGlass = useHapticClick(() => setIsMagnifyingGlassVisible(!isMagnifyingGlassVisible));
  const handleToggleMenu = useHapticClick(() => setIsMenuOpen(!isMenuOpen));
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
    <header className="sticky top-0 z-50 flex w-full flex-wrap items-center justify-between bg-white p-3 shadow-main md:flex-nowrap">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-hidden">
        {!isMagnifyingGlassVisible && (
          <>
            {showBackButton && (
              <button onClick={handleBack} className="rounded-full p-2 hover:bg-gray-100" aria-label="Volver a la página anterior">
                <ArrowLeft size={24} />
              </button>
            )}
            {pageIcon && React.createElement(pageIcon, { size: 28, className: "text-gray-700" })}
            {pageTitle && (
              <h1
                className="max-w-[60vw] truncate text-lg font-bold text-gray-900 md:text-xl"
                title={pageTitle}
              >
                {pageTitle}
              </h1>
            )}
          </>
        )}
        {isMagnifyingGlassVisible && (
          <form onSubmit={handleMagnifyingGlassSubmit} className="flex w-full items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <MagnifyingGlass size={20} className="text-gray-500" />
              </div>
              <input
                type="number"
                autoFocus
                value={MagnifyingGlassValue}
                onChange={(e) => setMagnifyingGlassValue(e.target.value)}
                placeholder="Buscar juego por ID..."
                className="w-full rounded-full bg-gray-100 py-3 pr-4 pl-10 text-gray-900 focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="staff-btn staff-btn-primary min-h-12 w-auto shrink-0 px-5 text-sm"
            >
              Buscar
            </button>
          </form>
        )}
      </div>

      <div className="flex min-w-0 flex-shrink-0 items-center gap-1">
        {!isMagnifyingGlassVisible && <NotificationsBell />}
        <button onClick={handleToggleMagnifyingGlass} className="rounded-full p-2 hover:bg-gray-100" aria-label={isMagnifyingGlassVisible ? "Cerrar búsqueda" : "Abrir búsqueda"}>
          {isMagnifyingGlassVisible ? <X size={20} /> : <MagnifyingGlass size={20} />}
        </button>

        {!isMagnifyingGlassVisible && (
          <div className="relative">
            <button onClick={handleToggleMenu} className="flex items-center gap-1 rounded-full p-2 hover:bg-gray-100" aria-label="Menú">
              {isAdmin && (
                <span className="rounded-full bg-warning p-1" title="Administrador">
                  <Crown size={12} className="text-gray-800" />
                </span>
              )}
              <DotsThreeVertical size={20} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 z-[9999] mt-2 w-48 rounded-main bg-white py-1 shadow-main">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-danger hover:bg-gray-100"
                >
                  <SignOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
