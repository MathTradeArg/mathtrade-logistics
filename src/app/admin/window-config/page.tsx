"use client";

import { Settings, Save, Plus, Trash2, Monitor, ChevronDown, ChevronUp, Cog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { AppHeader } from '@/components/common';
import { useHapticClick } from '@/hooks/useHapticClick';
import { getGlobalDisplayConfig, updateGlobalMaxUsers, updateGlobalPollingInterval } from '@/utils/windowStorage';

interface WindowConfig {
  id: number;
  name: string;
  tables: string[];
}

export default function WindowConfigPage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading } = useAuth();
  const { setSuccess, setError } = useActionStatus();
  const router = useRouter();
  const [windows, setWindows] = useState<WindowConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [globalMaxUsers, setGlobalMaxUsers] = useState(10);
  const [pollingInterval, setPollingInterval] = useState(10);
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);

  const { execute: fetchWindowConfig } = useApi<WindowConfig[]>('logistics/windows/config/', { method: 'GET' });
  const { execute: saveWindowConfig } = useApi<any>('logistics/windows/config/', { method: 'POST' });
  const { execute: fetchAvailableTables } = useApi<{available_tables: string[], assigned_tables: string[]}>('logistics/windows/available-tables/', { method: 'GET' });

  const handleBackClick = useHapticClick(() => router.push('/'));
  const handleGoToAdminPanel = useHapticClick(() => router.push('/admin/ready-to-pickup'));

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const globalConfig = getGlobalDisplayConfig();
      setGlobalMaxUsers(globalConfig.maxUsers);
      setPollingInterval(globalConfig.pollingInterval);
      
      const configData = await fetchWindowConfig();
      if (configData) {
        setWindows(configData || []);
      }
      
      const tablesData = await fetchAvailableTables();
      if (tablesData) {
        setAvailableTables(tablesData.available_tables || []);
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar la configuración.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchWindowConfig, fetchAvailableTables, setError]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadData();
    }
  }, [isAuthenticated, isAdmin, loadData]);

  useEffect(() => {
    if (!authIsLoading && (isAuthenticated === false || isAdmin === false)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authIsLoading, router]);

  const addWindow = () => {
    const newId = Math.max(...windows.map(w => w.id), 0) + 1;
    const newWindow = { 
      id: newId, 
      name: `Ventanilla ${newId}`, 
      tables: []
    };
    
    setWindows([newWindow, ...windows]);
  };

  const removeWindow = (id: number) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const updateWindow = (id: number, updates: Partial<WindowConfig>) => {
    setWindows(windows.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleMaxUsersChange = (newMaxUsers: number) => {
    setGlobalMaxUsers(newMaxUsers);
    updateGlobalMaxUsers(newMaxUsers);
  };

  const handlePollingIntervalChange = (newInterval: number) => {
    setPollingInterval(newInterval);
    updateGlobalPollingInterval(newInterval);
  };

  const assignTableToWindow = (windowId: number, table: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, tables: [...w.tables, table] }
        : w
    ));
  };

  const removeTableFromWindow = (windowId: number, table: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, tables: w.tables.filter(t => t !== table) }
        : w
    ));
  };

  const getAvailableTablesForWindow = useCallback((windowId: number) => {
    const currentUsedTables = windows.flatMap(w => w.tables);
    return availableTables.filter(table => !currentUsedTables.includes(table));
  }, [windows, availableTables]);

  // Memo para forzar re-render de los dropdowns cuando cambien las mesas disponibles
  const availableTablesMap = useMemo(() => {
    const map = new Map<number, string[]>();
    windows.forEach(window => {
      map.set(window.id, getAvailableTablesForWindow(window.id));
    });
    return map;
  }, [windows, getAvailableTablesForWindow]);

  const saveConfiguration = async () => {
    try {
      const config = windows.map(w => ({
        name: w.name,
        tables: w.tables
      }));
      await saveWindowConfig(config);
      
      setSuccess('Configuración guardada exitosamente.');
    } catch (err) {
      console.error('Error al guardar configuración:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración.');
    }
  };

  const handleAddWindow = useHapticClick(addWindow);
  const handleSaveConfiguration = useHapticClick(saveConfiguration);
  const handleRemoveWindow = useHapticClick((id: number) => removeWindow(id));
  const handleRemoveTableFromWindow = useHapticClick((windowId: number, table: string) => removeTableFromWindow(windowId, table));
  const handleAssignTableToWindow = useHapticClick((windowId: number, table: string) => assignTableToWindow(windowId, table));
  const handleToggleGlobalConfig = useHapticClick(() => setShowGlobalConfig(!showGlobalConfig));

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex justify-center items-center min-h-screen"><p>Cargando...</p></div>;
  }

  if (isAdmin === false) {
    return <div className="flex justify-center items-center min-h-screen"><p>Acceso denegado.</p></div>;
  }

  return (
    <div className="w-full min-h-screen nm-surface text-gray-900 dark:text-gray-100 nm-font">
      <AppHeader
        pageTitle="Configuración de Ventanillas"
        pageIcon={Settings as any}
        showBackButton={true}
        onBackClick={handleBackClick}
      />
      
      <main className="w-full p-3 md:p-4 lg:p-6 flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500 nm-text-shadow">Cargando configuración...</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="nm-surface p-4 md:p-6">
              <div className="flex flex-col mb-6 justify-center items-center">
                <button
                  onClick={handleToggleGlobalConfig}
                  className="nm-btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2 mb-4"
                >
                  <Cog size={16} />
                  Configuración Local del Display
                  {showGlobalConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showGlobalConfig && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                          Máx. usuarios por ventanilla
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={globalMaxUsers}
                          onChange={(e) => handleMaxUsersChange(parseInt(e.target.value) || 10)}
                          className="nm-input w-full"
                          placeholder="10"
                        />
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Cantidad máxima de usuarios mostrados por ventanilla en el display
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                          Intervalo de actualización (segundos)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={pollingInterval}
                          onChange={(e) => handlePollingIntervalChange(parseInt(e.target.value) || 10)}
                          className="nm-input w-full"
                          placeholder="10"
                        />
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Frecuencia de actualización automática del display
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-3">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 nm-text-shadow">
                  Ventanillas ({windows.length})
                </h2>
                <button
                  onClick={handleAddWindow}
                  className="nm-btn-primary flex items-center justify-center gap-2 text-sm px-3 py-2"
                >
                  <Plus size={16} />
                  Agregar Ventanilla
                </button>
              </div>

              <div className="space-y-3 md:space-y-4">
                {windows.map((window) => (
                  <div key={window.id} className="nm-list-item p-3 md:p-4">
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 nm-text-shadow">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={window.name}
                            onChange={(e) => updateWindow(window.id, { name: e.target.value })}
                            className="nm-input w-full"
                          />
                        </div>
                        {windows.length > 1 && (
                          <button
                            onClick={() => handleRemoveWindow(window.id)}
                            className="mt-6 p-2 text-red-500 hover:text-red-700 nm-btn nm-btn-finish flex-shrink-0"
                            title="Eliminar ventanilla"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 nm-text-shadow">
                        Mesas asignadas ({window.tables.length})
                      </label>
                      
                      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
                        {window.tables.length === 0 ? (
                          <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No hay mesas asignadas
                          </span>
                        ) : (
                          window.tables.map((table) => (
                            <span
                              key={table}
                              className="nm-idbox inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 text-sm nm-text-shadow px-2 py-1"
                            >
                              Mesa {table}
                              <button
                                onClick={() => handleRemoveTableFromWindow(window.id, table)}
                                className="hover:text-red-500 ml-1 nm-text-no-shadow text-lg leading-none"
                                title="Quitar mesa"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      
                      <select
                        key={`${window.id}-${availableTablesMap.get(window.id)?.length || 0}`}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignTableToWindow(window.id, e.target.value);
                          }
                        }}
                        className="nm-select w-full"
                      >
                        <option value="">Seleccionar mesa para asignar...</option>
                        {(availableTablesMap.get(window.id) || []).map((table) => (
                          <option key={table} value={table}>Mesa {table}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3">
            
              <button
                onClick={handleSaveConfiguration}
                className="nm-btn-primary flex items-center justify-center gap-2 text-sm px-4 py-2"
              >
                <Save size={16} />
                Guardar Configuración
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
