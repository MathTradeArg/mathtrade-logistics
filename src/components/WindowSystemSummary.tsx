import React from 'react';
import { CheckCircle, Settings, Users, Monitor } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'in-progress' | 'pending';
}

const features: Feature[] = [
  {
    title: 'Configuración de Ventanillas',
    description: 'Crear y configurar ventanillas con asignación de mesas y límites de usuarios',
    icon: <Settings className="w-5 h-5" />,
    status: 'completed'
  },
  {
    title: 'Vista Organizada por Ventanillas',
    description: 'Mostrar usuarios listos organizados por ventanillas en lugar de una lista única',
    icon: <Monitor className="w-5 h-5" />,
    status: 'completed'
  },
  {
    title: 'Gestión de Estados',
    description: 'Marcar usuarios como "Atendido" o "No Aparece" con actualización en tiempo real',
    icon: <Users className="w-5 h-5" />,
    status: 'completed'
  },
  {
    title: 'Límite de Usuarios Visible',
    description: 'Mostrar solo X usuarios por ventanilla (configurable) para mejor organización',
    icon: <CheckCircle className="w-5 h-5" />,
    status: 'completed'
  }
];

const FeatureStatus: React.FC<{ status: Feature['status'] }> = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'completed': return 'nm-btn-primary';
      case 'in-progress': return 'nm-btn-warning';
      case 'pending': return 'nm-btn-finish';
      default: return 'nm-btn-finish';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'in-progress': return 'En Progreso';
      case 'pending': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium ${getStatusClass()}`}>
      {getStatusText()}
    </span>
  );
};

const WindowSystemSummary: React.FC = () => {
  return (
    <div className="nm-surface p-6 max-w-4xl mx-auto nm-font">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 nm-text-shadow">
          Sistema de Ventanillas - Mejoras Implementadas
        </h2>
        <p className="text-gray-600 dark:text-gray-400 nm-text-shadow">
          Solución completa para organizar la entrega de juegos en eventos presenciales
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div key={index} className="nm-list-item p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 dark:text-blue-400 mt-1 nm-appheader-icon">
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 nm-text-shadow">
                    {feature.title}
                  </h3>
                  <FeatureStatus status={feature.status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 nm-text-shadow">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 nm-surface-double p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 nm-text-shadow">
          Cómo usar el sistema:
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200 nm-text-shadow">
          <li>Ir a &quot;Panel de Control&quot; → &quot;Configurar Ventanillas&quot;</li>
          <li>Configurar ventanillas y asignar mesas</li>
          <li>Ir a &quot;Ver Usuarios Listos para Retirar&quot;</li>
          <li>Marcar usuarios como atendidos durante el evento</li>
        </ol>
      </div>

      <div className="mt-4 nm-surface-double p-4">
        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 nm-text-shadow">
          Sistema Integrado:
        </h3>
        <p className="text-sm text-green-800 dark:text-green-200 nm-text-shadow">
          Sistema completamente integrado con las APIs del backend. Las ventanillas se asignan automáticamente basándose en el <code className="nm-idbox px-1">table_number</code> del usuario.
        </p>
      </div>
    </div>
  );
};

export default WindowSystemSummary;
