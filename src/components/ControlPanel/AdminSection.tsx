"use client";

import { LoadingSpinner } from '@/components/ui';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { AlertCircle, CheckCircle2, Crown, Monitor, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';


interface AdminSectionProps {
  isUpdatingPhase: boolean;
  eventPhase: number | null;
  phaseUpdateSuccess: string | null;
  phaseUpdateError: string | null;
  onPhaseChange: (newPhase: number) => void;
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  isUpdatingPhase,
  eventPhase,
  phaseUpdateSuccess,
  phaseUpdateError,
  onPhaseChange,
}) => {
  const router = useRouter();
  const { closePanel } = useControlPanel();
  const handlePhaseChange = (newPhase: number) => {
    if (window.confirm(`¿Estás seguro que querés cambiar a la fase ${newPhase}?`)) {
      onPhaseChange(newPhase);
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-4 pb-4">
      <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
        <Crown size={16} className="text-yellow-500 mr-1" />
        Acciones de Administrador
      </h3>
      <div className="space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cambiar fase del evento:</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handlePhaseChange(0)} disabled={isUpdatingPhase || eventPhase === 0} className="px-3 py-1 text-xs font-medium text-white rounded bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed">No iniciado</button>
          <button onClick={() => handlePhaseChange(1)} disabled={isUpdatingPhase || eventPhase === 1} className="px-3 py-1 text-xs font-medium text-white rounded bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 disabled:cursor-not-allowed">Recepción</button>
          <button onClick={() => handlePhaseChange(2)} disabled={isUpdatingPhase || eventPhase === 2} className="px-3 py-1 text-xs font-medium text-white rounded bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed">Entrega</button>
        </div>
        {isUpdatingPhase && <div className="flex items-center text-sm text-gray-500"><LoadingSpinner /> <span className="ml-2">Actualizando fase...</span></div>}
        {phaseUpdateSuccess && <p className="text-sm text-green-600 dark:text-green-400 flex items-center"><CheckCircle2 size={16} className="mr-1" /> {phaseUpdateSuccess}</p>}
        {phaseUpdateError && <p className="text-sm text-red-600 dark:text-red-400 flex items-center"><AlertCircle size={16} className="mr-1" /> {phaseUpdateError}</p>}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <Monitor size={16} className="text-purple-500 mr-1" />
          Vistas para TV
        </h3>
        <button
          onClick={() => {
            closePanel();
            router.push('/admin/ready-to-pickup');
          }}
          className="w-full px-3 py-2 text-sm font-medium text-white rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Users size={16} className="mr-2" />
          Ver Usuarios Listos para Retirar
        </button>
      </div>


    </div>
  );
};
