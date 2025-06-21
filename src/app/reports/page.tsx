/* eslint-disable @next/next/no-img-element */
"use client";

import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, FileSearch, UserSearch, X } from 'lucide-react';
import { ChangeEvent, FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import FullScreenImageModal from '@/components/FullScreenImageModal'; 
import { LoadingSpinner } from '@/components/ui'; 
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface Item {
  id: number;
  title: string;
  assigned_trade_code: number;
}


export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando página de reportes..." /></div>}>
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();

  type ReportStep = 'initial' | 'find_item' | 'find_user' | 'take_photo' | 'describe_problem' | 'submitted';

  const [currentStep, setCurrentStep] = useState<ReportStep>('initial');
  const [reportType, setReportType] = useState<'item' | 'user' | null>(null);
  const [searchTermItems, setSearchTermItems] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTermUsers, setSearchTermUsers] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [itemPhotos, setItemPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reportReason, setReportReason] = useState('');

  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);

  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [errorItems, setErrorItems] = useState<string | null>(null);

  const handleSelectReportType = (type: 'item' | 'user') => {
    setReportType(type);
    setCurrentStep(type === 'item' ? 'find_item' : 'find_user');
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPhotos = [...itemPhotos, ...files];
      const newPreviews = [...photoPreviews, ...files.map(file => URL.createObjectURL(file))];
      setItemPhotos(newPhotos);
      setPhotoPreviews(newPreviews);
    }
  };

  const resetForm = () => {
    setCurrentStep('initial');
    setReportType(null);
    setSearchTermItems('');
    setSelectedItem(null);
    setSearchTermUsers('');
    setSelectedUser(null);
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setItemPhotos([]);
    setPhotoPreviews([]);
    setReportReason('');
  };

  const handleBack = () => {
    setReportError('');
    switch (currentStep) {
      case 'find_item':
      case 'find_user':
        resetForm();
        break;
      case 'take_photo':
        setCurrentStep('find_item');
        break;
      case 'describe_problem':
        if (reportType === 'item') {
          setCurrentStep('take_photo');
        } else {
          setCurrentStep('find_user');
        }
        break;
    }
  };

  const handleClearPhoto = (indexToRemove: number) => {
    URL.revokeObjectURL(photoPreviews[indexToRemove]);

    setItemPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchAvailableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setErrorUsers(null);
    if (!isAuthenticated) {
      setErrorUsers("No autenticado. No se pueden cargar los usuarios.");
      setIsLoadingUsers(false);
      return;
    }
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}mathtrades/7/users/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar los usuarios.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const data: User[] = await response.json();
      setAvailableUsers(data);
    } catch (err) {
      setErrorUsers(err instanceof Error ? err.message : "Error desconocido al cargar usuarios.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAuthenticated]);

  const fetchAvailableItems = useCallback(async () => {
    setIsLoadingItems(true);
    setErrorItems(null);
    if (!isAuthenticated) {
      setErrorItems("No autenticado. No se pueden cargar los ítems.");
      setIsLoadingItems(false);
      return;
    }
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar los ítems.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const data: Item[] = await response.json();
      setAvailableItems(data);
    } catch (err) {
      setErrorItems(err instanceof Error ? err.message : "Error desconocido al cargar ítems.");
    } finally {
      setIsLoadingItems(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentStep === 'find_user' && availableUsers.length === 0 && !isLoadingUsers && !errorUsers) {
      fetchAvailableUsers();
    }
  }, [currentStep, availableUsers.length, isLoadingUsers, errorUsers, fetchAvailableUsers]);

  useEffect(() => {
    if (currentStep === 'find_item' && availableItems.length === 0 && !isLoadingItems && !errorItems) {
      fetchAvailableItems();
    }
  }, [currentStep, availableItems.length, isLoadingItems, errorItems, fetchAvailableItems]);

  const filteredUsersForDisplay = useMemo(() => {
    if (!searchTermUsers.trim()) {
      return availableUsers;
    }
    const lowerCaseSearchTerm = searchTermUsers.toLowerCase();
    return availableUsers.filter(user =>
      user.first_name.toLowerCase().includes(lowerCaseSearchTerm) ||
      user.last_name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [availableUsers, searchTermUsers]);

  const filteredItemsForDisplay = useMemo(() => {
    if (!searchTermItems.trim()) {
      return availableItems;
    }
    const lowerCaseSearchTerm = searchTermItems.toLowerCase();
    return availableItems.filter(item =>
      item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.assigned_trade_code.toString().includes(lowerCaseSearchTerm)
    );
  }, [availableItems, searchTermItems]);

  const handleClearUserSelection = () => {
    setSelectedUser(null);
    setSearchTermUsers('');
  };

  const handleClearItemSelection = () => {
    setSelectedItem(null);
    setSearchTermItems('');
  };

  const handleFindSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (reportType === 'item') {
      if (!selectedItem) {
        setReportError("Por favor, seleccioná un ítem.");
        return;
      }
      setCurrentStep('take_photo');
    } else {
      if (!selectedUser) {
        setReportError("Por favor, seleccioná un usuario.");
        return;
      }
      setCurrentStep('describe_problem');
    }
  };

  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoadingReport(true);
    setReportError('');

    console.log("Enviando reporte:", { type: reportType, itemId: selectedItem?.id, userId: selectedUser?.id, photos: itemPhotos, reason: reportReason });

    await new Promise(resolve => setTimeout(resolve, 1500));
    setReportError("Función de reporte aún no implementada."); // Placeholder
    setIsLoadingReport(false);
    // setCurrentStep('submitted'); // Descomentar cuando la API esté lista
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Validando sesión..." /></div>;
  }

  return (
    <main className="flex flex-col items-center min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          pageTitle="Reportar"
          pageIcon={AlertTriangle as any}
          showBackButton={true}
        />
      )}

      <section className="w-full max-w-xl mx-auto p-4 sm:p-6 flex-grow flex flex-col justify-center">
        {currentStep !== 'initial' && currentStep !== 'submitted' && (
          <button onClick={handleBack} className="self-start mb-4 flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-secondary-blue dark:hover:text-sky-400 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Volver
          </button>
        )}

        {currentStep === 'initial' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">¿Qué querés reportar?</h2>
            <div className="space-y-4">
              <button onClick={() => handleSelectReportType('item')} className="w-full flex items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow active:scale-95">
                <FileSearch size={32} className="mr-4 text-orange-500" />
                <span className="text-lg font-semibold">Un Ítem</span>
              </button>
              <button onClick={() => handleSelectReportType('user')} className="w-full flex items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow active:scale-95">
                <UserSearch size={32} className="mr-4 text-orange-500" />
                <span className="text-lg font-semibold">Un Usuario</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 'find_item' && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4">Buscá el ítem a reportar</h2>
            {isLoadingItems ? (
              <LoadingSpinner message="Cargando ítems..." />
            ) : errorItems ? (
              <p className="text-red-500 dark:text-red-400 text-sm">{errorItems}</p>
            ) : (
              <form onSubmit={handleFindSubmit} className="space-y-4">
                <div>
                  <label htmlFor="searchTermItems" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Ítem</label>
                  <input type="text" id="searchTermItems" value={searchTermItems} onChange={(e) => setSearchTermItems(e.target.value)} placeholder="Título o número de etiqueta" className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                {selectedItem && (
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-200">
                    <span>Ítem seleccionado: <span className="font-semibold">{selectedItem.title} (#{selectedItem.assigned_trade_code})</span></span>
                    <button type="button" onClick={handleClearItemSelection} className="ml-2 p-1 rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" aria-label="Limpiar selección de ítem"><X size={16} /></button>
                  </div>
                )}
                <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-1 space-y-1 bg-gray-50 dark:bg-gray-750">
                  {filteredItemsForDisplay.length > 0 ? (
                    filteredItemsForDisplay.map(item => (
                      <button key={item.id} type="button" onClick={() => setSelectedItem(item)} className={`w-full text-left p-2 rounded-md transition-colors ${selectedItem?.id === item.id ? 'bg-secondary-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'}`}>
                        {item.title} (#{item.assigned_trade_code})
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No se encontraron ítems.</p>
                  )}
                </div>
                <button type="submit" disabled={!selectedItem} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50">
                  Siguiente
                </button>
              </form>
            )}
          </div>
        )}

        {currentStep === 'find_user' && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4">Buscá al usuario a reportar</h2>
            {isLoadingUsers ? (
              <LoadingSpinner message="Cargando usuarios..." />
            ) : errorUsers ? (
              <p className="text-red-500 dark:text-red-400 text-sm">{errorUsers}</p>
            ) : (
              <form onSubmit={handleFindSubmit} className="space-y-4">
                <div>
                  <label htmlFor="searchTermUsers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Usuario</label>
                  <input type="text" id="searchTermUsers" value={searchTermUsers} onChange={(e) => setSearchTermUsers(e.target.value)} placeholder="Nombre o apellido" className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                {selectedUser && (
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-200">
                    <span>Usuario seleccionado: <span className="font-semibold">{selectedUser.first_name} {selectedUser.last_name}</span></span>
                    <button
                      type="button"
                      onClick={handleClearUserSelection}
                      className="ml-2 p-1 rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      aria-label="Limpiar selección de usuario"
                    ><X size={16} /></button>
                  </div>
                )}
                <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-1 space-y-1 bg-gray-50 dark:bg-gray-750">
                  {filteredUsersForDisplay.length > 0 ? (
                    filteredUsersForDisplay.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className={`w-full text-left p-2 rounded-md transition-colors ${selectedUser?.id === user.id ? 'bg-secondary-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'}`}
                      >
                        {user.first_name} {user.last_name}
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No se encontraron usuarios.</p>
                  )}
                </div>
                <button type="submit" disabled={!selectedUser} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50">
                  Siguiente
                </button>
              </form>
            )}
          </div>
        )}

        {currentStep === 'take_photo' && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl text-center">
            <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4">Tomale una foto al ítem</h2>
            <div className="space-y-4">
              <input type="file" id="itemPhoto" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" ref={fileInputRef} multiple />
              <label htmlFor="itemPhoto" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-secondary-blue hover:bg-blue-700 cursor-pointer">
                <Camera className="mr-2" />
                {photoPreviews.length > 0 ? 'Añadir más fotos' : 'Seleccionar Foto(s)'}
              </label>
              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photoPreviews.map((previewUrl, index) => (
                    <div key={index} className="relative group cursor-pointer" onClick={() => setFullScreenPhoto(previewUrl)}>
                      <img src={previewUrl} alt={`Vista previa ${index + 1}`} className="w-full h-24 object-cover rounded-lg shadow-md" />
                      <button
                        type="button"
                        onClick={() => handleClearPhoto(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 transition-colors focus:ring-2 focus:ring-white"
                        aria-label={`Quitar foto ${index + 1}`}
                        onClickCapture={(e) => e.stopPropagation()}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setCurrentStep('describe_problem')} disabled={itemPhotos.length === 0} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50">
                Siguiente
              </button>
            </div>
          </div>
        )}

        {currentStep === 'describe_problem' && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4">Describí el problema</h2>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label htmlFor="reportReason" className="sr-only">Motivo del Reporte</label>
                <textarea id="reportReason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={4} required placeholder="Ej: El usuario no se presentó, llegó tarde, etc." className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"></textarea>
              </div>
              <button type="submit" disabled={isLoadingReport} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50">
                {isLoadingReport ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </form>
          </div>
        )}

        {currentStep === 'submitted' && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">¡Reporte Enviado!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Gracias por tu colaboración para mantener la comunidad segura y confiable.</p>
            <button onClick={resetForm} className="w-full px-4 py-2 bg-secondary-blue hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95">
              Crear otro reporte
            </button>
          </div>
        )}

        <div className="mt-4 text-center">
          {reportError && <p className="text-red-500 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/30 rounded-md">{reportError}</p>}
        </div>
      </section>

      <FullScreenImageModal
        imageUrl={fullScreenPhoto}
        onClose={() => setFullScreenPhoto(null)}
      />
    </main>
  );
}
