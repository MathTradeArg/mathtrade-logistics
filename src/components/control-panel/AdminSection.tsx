"use client";
import { useRouter } from 'next/navigation';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { Monitor, UserFocus, Gear, Television } from 'phosphor-react';
import { LoadingSpinner } from '@/components/common/ui';
import { useHapticClick } from '@/hooks/useHapticClick';

interface AdminSectionProps {
  isUpdatingPhase: boolean;
  eventPhase: number;
  onPhaseChange: (phase: number) => void;
  hideTVViews?: boolean;
  hideAdminActions?: boolean;
}

const AdminSection: React.FC<AdminSectionProps> = ({
  isUpdatingPhase,
  eventPhase,
  onPhaseChange,
  hideTVViews = false,
  hideAdminActions = false,
}) => {
  const router = useRouter();
  const { closePanel } = useControlPanel();

  const handlePhaseChange = useHapticClick((newPhase: number) => {
    const phaseNames = ['no iniciado', 'recepción', 'entrega'];
    const phaseName = phaseNames[newPhase] || 'fase desconocida';
    
    if (window.confirm(`¿Estás seguro que querés pasar a la fase de ${phaseName}?`)) {
      onPhaseChange(newPhase);
    }
  });

  const handleAdminPanelClick = useHapticClick(() => {
    closePanel();
    router.push('/admin/ready-to-pickup');
  });

  const handleWindowConfigClick = useHapticClick(() => {
    closePanel();
    router.push('/admin/window-config');
  });

  const handleTVViewClick = useHapticClick((path: string) => {
    const newWindow = window.open(path, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.focus();
    }
  });

  const phases = [
    { id: 0, name: 'No iniciado', color: 'bg-gray-500' },
    { id: 1, name: 'Recepción', color: 'bg-accent-yellow' },
    { id: 2, name: 'Entrega', color: 'bg-accent-green' },
  ];

  return (
    <div className="space-y-6">
      {!hideAdminActions && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Acciones de Administrador
          </h3>
          
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Cambiar fase del evento
              </h4>
              <div className="flex flex-wrap gap-2">
                {phases.map((phase) => (
                  <button
                    key={phase.id}
                    onClick={() => handlePhaseChange(phase.id)}
                    disabled={isUpdatingPhase || eventPhase === phase.id}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      eventPhase === phase.id
                        ? `${phase.color} text-white`
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    {phase.name}
                  </button>
                ))}
              </div>
              {isUpdatingPhase && (
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <LoadingSpinner />
                  <span className="ml-2">Actualizando fase...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleAdminPanelClick}
                className="flex items-center gap-2 p-3 bg-secondary-blue hover:bg-blue-700 text-white rounded-lg transition-all duration-150 ease-in-out active:scale-95"
              >
                <UserFocus size={20} />
                <span>Administrar usuarios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!hideTVViews && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Administrar logística de entrega
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleTVViewClick('/display/ready-to-pickup')}
              className="flex items-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-150 ease-in-out active:scale-95"
            >
              <Television size={20} />
              <span>Pantalla Gigante</span>
            </button>
            <button
              onClick={handleWindowConfigClick}
              className="flex items-center gap-2 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-150 ease-in-out active:scale-95"
            >
              <Gear size={20} />
              <span>Configurar Ventanillas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSection;
