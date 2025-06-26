"use client";

import { Settings, Users, CheckCircle, Clock, UserX, Monitor, Save, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import WindowSystemSummary from '@/components/WindowSystemSummary';

export default function DemoPage() {
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  return (
    <main className="w-full p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen nm-font">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
            Sistema de Ventanillas - Demo Neumórfico
          </h1>
          <p className="text-gray-600 dark:text-gray-400 nm-text-shadow">
            Demostración de todos los estilos neumórficos con soporte para dark mode
          </p>
        </div>

        <WindowSystemSummary />

        <div className="nm-surface p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
            Botones Neumórficos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="nm-btn-primary flex items-center justify-center gap-2">
              <Save size={16} />
              Primario
            </button>
            <button className="nm-btn-secondary flex items-center justify-center gap-2">
              <Settings size={16} />
              Secundario
            </button>
            <button className="nm-btn-warning flex items-center justify-center gap-2">
              <UserX size={16} />
              Advertencia
            </button>
            <button className="nm-btn-finish flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              Neutral
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 nm-text-shadow">
              Estados Especiales
            </h3>
            <div className="flex gap-4">
              <button 
                className={`nm-btn ${isPressed ? 'nm-pressed' : ''} flex items-center gap-2`}
                onClick={() => setIsPressed(!isPressed)}
              >
                <Monitor size={16} />
                {isPressed ? 'Presionado' : 'Normal'}
              </button>
              <button className="nm-btn-colored flex items-center gap-2">
                <Plus size={16} />
                Colorido
              </button>
            </div>
          </div>
        </div>

        <div className="nm-surface p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
            Elementos de Formulario
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 nm-text-shadow">
                Campo de Entrada
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe algo aquí..."
                className="nm-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 nm-text-shadow">
                Selector
              </label>
              <select
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                className="nm-select w-full"
              >
                <option value="">Selecciona una opción...</option>
                <option value="opcion1">Opción 1</option>
                <option value="opcion2">Opción 2</option>
                <option value="opcion3">Opción 3</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {['Ventanilla 1', 'Ventanilla 2', 'Ventanilla 3'].map((ventanilla, index) => (
            <div key={ventanilla} className="nm-surface overflow-hidden">
              <div className="nm-surface-double p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-sky-600 dark:text-sky-300 text-center nm-text-shadow">
                  {ventanilla}
                </h3>
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span className="text-green-600 dark:text-green-400 nm-text-shadow">
                    <Clock size={14} className="inline mr-1" />
                    {3 - index}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 nm-text-shadow">
                    <CheckCircle size={14} className="inline mr-1" />
                    {index + 1}
                  </span>
                  <span className="text-red-600 dark:text-red-400 nm-text-shadow">
                    <UserX size={14} className="inline mr-1" />
                    {index}
                  </span>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {['Juan Pérez', 'María González', 'Carlos Rodríguez'].slice(0, 3 - index).map((usuario, userIndex) => (
                  <div key={usuario} className={`nm-list-item p-3 ${userIndex === 0 ? 'nm-btn-primary' : userIndex === 1 ? 'nm-btn-secondary' : 'nm-btn-warning'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold nm-text-shadow">{usuario}</p>
                        <p className="text-xs opacity-75 nm-text-shadow">Mesa A{userIndex + 1}</p>
                      </div>
                      {userIndex === 0 && <Clock size={16} />}
                      {userIndex === 1 && <CheckCircle size={16} />}
                      {userIndex === 2 && <UserX size={16} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="nm-surface p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
            Lista de Elementos
          </h2>
          <div className="nm-list">
            {['Configurar Ventanillas', 'Asignar Mesas', 'Gestionar Usuarios', 'Ver Estadísticas'].map((item, index) => (
              <div key={item} className={`nm-list-item p-3 ${index === 1 ? 'nm-list-item-selected' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="nm-idbox">
                    {index + 1}
                  </div>
                  <span className="text-gray-900 dark:text-gray-100 nm-text-shadow">{item}</span>
                  {index === 1 && (
                    <span className="nm-idbox-selected ml-auto">
                      Seleccionado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="nm-surface p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
            Chips y Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((mesa) => (
              <span key={mesa} className="nm-idbox text-blue-700 dark:text-blue-300 nm-text-shadow">
                Mesa {mesa}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <span className="nm-idbox-selected">
              Elemento Seleccionado
            </span>
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 nm-text-shadow">
            🎨 Diseño neumórfico completamente implementado con soporte para dark mode
          </p>
        </div>
      </div>
    </main>
  );
}
