"use client";

import React from 'react';
import { Settings, Save, Plus, Trash2, Clock, CheckCircle, UserX, Monitor, Users, RefreshCw } from 'lucide-react';

export default function StylesDemoPage() {
  const [darkMode, setDarkMode] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [selectValue, setSelectValue] = React.useState('');
  const [checkboxValue, setCheckboxValue] = React.useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <main className="w-full p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen nm-font">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center nm-text-shadow">
            <Settings size={40} className="mr-3 text-blue-500 nm-appheader-icon" />
            Demo de Estilos Neumórficos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 nm-text-shadow">
            Demostración de todos los estilos neumórficos disponibles con compatibilidad dark mode
          </p>
          
          <div className="mt-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="nm-btn-primary flex items-center gap-2"
            >
              {darkMode ? '☀️' : '🌙'}
              {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="nm-surface p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
              Superficies
            </h2>
            <div className="space-y-4">
              <div className="nm-surface p-4">
                <p className="nm-text-shadow">nm-surface: Superficie básica</p>
              </div>
              <div className="nm-surface-double p-4">
                <p className="nm-text-shadow">nm-surface-double: Superficie con efecto doble</p>
              </div>
              <div className="nm-surface nm-surface-no-top-radius p-4">
                <p className="nm-text-shadow">nm-surface-no-top-radius: Sin radio superior</p>
              </div>
            </div>
          </div>

          <div className="nm-surface p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
              Botones
            </h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button className="nm-btn-primary flex items-center gap-2">
                  <Save size={16} />
                  Primary
                </button>
                <button className="nm-btn-secondary flex items-center gap-2">
                  <Plus size={16} />
                  Secondary
                </button>
                <button className="nm-btn-warning flex items-center gap-2">
                  <Trash2 size={16} />
                  Warning
                </button>
                <button className="nm-btn-finish flex items-center gap-2">
                  <Settings size={16} />
                  Finish
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="nm-btn">Básico</button>
                <button className="nm-btn-colored">Coloreado</button>
                <button className="nm-btn nm-pressed">Presionado</button>
              </div>
            </div>
          </div>

          <div className="nm-surface p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
              Formularios
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 nm-text-shadow">
                  Input Field
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escribe aquí..."
                  className="nm-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 nm-text-shadow">
                  Select Field
                </label>
                <select
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  className="nm-select w-full"
                >
                  <option value="">Selecciona una opción...</option>
                  <option value="option1">Opción 1</option>
                  <option value="option2">Opción 2</option>
                  <option value="option3">Opción 3</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="demo-checkbox"
                  checked={checkboxValue}
                  onChange={(e) => setCheckboxValue(e.target.checked)}
                  className="nm-checkbox"
                />
                <label htmlFor="demo-checkbox" className="text-sm text-gray-700 dark:text-gray-300 nm-text-shadow">
                  Checkbox neumórfico
                </label>
              </div>
            </div>
          </div>

          <div className="nm-surface p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
              Listas
            </h2>
            <div className="nm-list">
              <div 
                className={`nm-list-item p-3 cursor-pointer ${selectedItem === 'item1' ? 'nm-list-item-selected' : ''}`}
                onClick={() => setSelectedItem(selectedItem === 'item1' ? null : 'item1')}
              >
                <div className="flex items-center gap-3">
                  <div className="nm-idbox">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="font-semibold nm-text-shadow">Item de Lista 1</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 nm-text-shadow">
                      Descripción del item
                    </p>
                  </div>
                </div>
              </div>
              <div 
                className={`nm-list-item p-3 cursor-pointer ${selectedItem === 'item2' ? 'nm-list-item-selected' : ''}`}
                onClick={() => setSelectedItem(selectedItem === 'item2' ? null : 'item2')}
              >
                <div className="flex items-center gap-3">
                  <div className="nm-idbox">
                    <Monitor size={16} />
                  </div>
                  <div>
                    <p className="font-semibold nm-text-shadow">Item de Lista 2</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 nm-text-shadow">
                      Otro item de ejemplo
                    </p>
                  </div>
                </div>
              </div>
              <div 
                className={`nm-list-item p-3 cursor-pointer ${selectedItem === 'item3' ? 'nm-list-item-selected' : ''}`}
                onClick={() => setSelectedItem(selectedItem === 'item3' ? null : 'item3')}
              >
                <div className="flex items-center gap-3">
                  <div className="nm-idbox">
                    <RefreshCw size={16} />
                  </div>
                  <div>
                    <p className="font-semibold nm-text-shadow">Item de Lista 3</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 nm-text-shadow">
                      Último item de ejemplo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="nm-surface p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
              Iconos y Estados
            </h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="nm-idbox text-green-600 dark:text-green-400">
                  <Clock size={16} className="mr-2" />
                  Listo
                </div>
                <div className="nm-idbox text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} className="mr-2" />
                  Atendido
                </div>
                <div className="nm-idbox text-red-600 dark:text-red-400">
                  <UserX size={16} className="mr-2" />
                  No Aparece
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="nm-idbox nm-idbox-selected">
                  <Users size={16} className="mr-2" />
                  Seleccionado
                </div>
                <div className="nm-idbox">
                  <Settings size={16} className="mr-2" />
                  Normal
                </div>
              </div>
            </div>
          </div>

          <div className="nm-surface p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
              Texto
            </h2>
            <div className="space-y-3">
              <p className="nm-text-shadow text-lg">
                Texto con sombra neumórfica (nm-text-shadow)
              </p>
              <p className="nm-text-no-shadow text-lg">
                Texto sin sombra (nm-text-no-shadow)
              </p>
              <p className="nm-font text-lg">
                Texto con fuente neumórfica (nm-font)
              </p>
              <div className="flex items-center gap-2">
                <Users size={24} className="nm-appheader-icon" />
                <span className="nm-text-shadow">Icono de header con estilo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 nm-surface p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 nm-text-shadow">
            Información sobre Estilos Neumórficos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 nm-text-shadow">
                Características Principales:
              </h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 nm-text-shadow">
                <li>• Sombras suaves que crean profundidad</li>
                <li>• Colores adaptativos para dark mode</li>
                <li>• Efectos táctiles en botones</li>
                <li>• Consistencia visual en toda la app</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 nm-text-shadow">
                Compatibilidad:
              </h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 nm-text-shadow">
                <li>• Modo claro y oscuro automático</li>
                <li>• Transiciones suaves entre estados</li>
                <li>• Optimizado para dispositivos móviles</li>
                <li>• Accesible y usable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
