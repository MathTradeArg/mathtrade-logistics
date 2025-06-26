/* eslint-disable @next/next/no-img-element */
"use client";

import AppHeader from '@/components/AppHeader';
import FullScreenImageModal from '@/components/FullScreenImageModal';
import { LoadingSpinner } from '@/components/ui';
import { useApi } from "@/hooks/useApi";
import { useAuth } from '@/hooks/useAuth';
import { generateHashedFilename } from "@/utils/file";
import { compressImage } from '@/utils/imageCompressor';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Crown, FileSearch, UserSearch, X } from "lucide-react";
import Link from 'next/link';
import { ChangeEvent, FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const normalizeSearchString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Error al leer el archivo de imagen.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });

interface User {
  id: number;
  first_name: string;
  last_name: string;
  bgg_user?: string;
  email?: string;
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
  const { isAuthenticated, isLoading: authIsLoading, isAdmin } = useAuth();

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

  const [reportError, setReportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const { data: availableUsers, isLoading: isLoadingUsers, error: errorUsers, execute: fetchAvailableUsers } = useApi<User[]>('mathtrades/7/users/');
  const { data: availableItems, isLoading: isLoadingItems, error: errorItems, execute: fetchAvailableItems } = useApi<Item[]>('logistics/items');
  const { execute: uploadImageApi, error: uploadImageApiError, clearError: clearUploadImageError } = useApi<any>('users/images/', { method: 'POST' });
  const { execute: submitReportApi, error: submitReportApiError, clearError: clearSubmitReportError } = useApi<any>('reports/', { method: 'POST' });

  const handleSelectReportType = (type: "item" | "user") => {
    setReportType(type);
    setCurrentStep(type === 'item' ? 'find_item' : 'find_user');
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPhotosWithHashedNames = files.map(file => new File([file], generateHashedFilename(file.name), {
        type: file.type,
        lastModified: file.lastModified,
      }));

      const newPhotos = [...itemPhotos, ...newPhotosWithHashedNames];
      const newPreviews = [...photoPreviews, ...newPhotosWithHashedNames.map(file => URL.createObjectURL(file))];

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
    setReportError('');
    setIsProcessing(false);
    setProcessingMessage('');
    clearUploadImageError();
    clearSubmitReportError();
  };

  const handleBack = () => {
    setReportError('');
    switch (currentStep) {
      case 'find_item':
      case 'find_user':
        resetForm();
        break;
      case 'take_photo':
        setCurrentStep(reportType === 'item' ? 'find_item' : 'initial');
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

  useEffect(() => {
    if (currentStep === 'find_user' && !availableUsers && !isLoadingUsers && !errorUsers) {
      fetchAvailableUsers();
    }
  }, [currentStep, availableUsers, isLoadingUsers, errorUsers, fetchAvailableUsers]);

  useEffect(() => {
    if (currentStep === 'find_item' && !availableItems && !isLoadingItems && !errorItems) {
      fetchAvailableItems();
    }
  }, [currentStep, availableItems, isLoadingItems, errorItems, fetchAvailableItems]);

  const filteredUsersForDisplay = useMemo(() => {
    const users = availableUsers || [];
    if (!searchTermUsers.trim()) {
      return users;
    }
    const normalizedSearchTerm = normalizeSearchString(searchTermUsers);
    return users.filter(user => {
      const fullNameMatch = normalizeSearchString(`${user.first_name} ${user.last_name}`).includes(normalizedSearchTerm);
      const bggUserMatch = normalizeSearchString(user.bgg_user || '').includes(normalizedSearchTerm);
      const emailMatch = normalizeSearchString(user.email || '').includes(normalizedSearchTerm);

      return fullNameMatch || bggUserMatch || emailMatch;
    });
  }, [availableUsers, searchTermUsers]);

  const filteredItemsForDisplay = useMemo(() => {
    const items = availableItems || [];
    if (!searchTermItems.trim()) {
      return items;
    }
    const normalizedSearchTerm = normalizeSearchString(searchTermItems);
    return items.filter(item =>
      normalizeSearchString(item.title).includes(normalizedSearchTerm) ||
      item.assigned_trade_code.toString().includes(searchTermItems.toLowerCase())
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
    setReportError('');
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

  const handleReportSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setReportError('');
    clearUploadImageError();
    clearSubmitReportError();

    if (!isAuthenticated) {
      setReportError("No autenticado. No se puede enviar el reporte.");
      return;
    }

    setIsProcessing(true);
    try {
      const uploadedImageIds: string[] = await Promise.all(
        itemPhotos.map(async (photo, index) => {
          setProcessingMessage(`Comprimiendo imagen ${index + 1}/${itemPhotos.length}...`);
          const compressedPhoto = await compressImage(photo);

          const MAX_SIZE_BYTES = 500 * 1024;
          if (compressedPhoto.size > MAX_SIZE_BYTES) {
            throw new Error(`La imagen '${photo.name}' no pudo ser comprimida por debajo de 500KB. Por favor, intente con una imagen de menor resolución.`);
          }

          setProcessingMessage(`Subiendo imagen ${index + 1}/${itemPhotos.length}...`);
          const imgCode = await fileToBase64(compressedPhoto);
          const imageUploadResult = await uploadImageApi({ img_code: imgCode });

          if (imageUploadResult && imageUploadResult.asset_url) {
            return imageUploadResult.asset_url;
          }
          if (typeof imageUploadResult === 'string') {
            return imageUploadResult;
          }

          console.warn("Unexpected image upload result:", imageUploadResult);
          throw new Error(`Respuesta inesperada al subir la imagen '${photo.name}'.`);
        })
      );

      setProcessingMessage('Enviando reporte...');
      const reportBody: {
        comment: string;
        reported_user?: number;
        item?: number;
        images?: string;
      } = {
        comment: reportReason,
      };

      if (reportType === 'user' && selectedUser) {
        reportBody.reported_user = selectedUser.id;
      } else if (reportType === 'item' && selectedItem) {
        reportBody.item = selectedItem.id;
      }

      if (uploadedImageIds.length > 0) {
        reportBody.images = uploadedImageIds.join(',');
      }

      await submitReportApi(reportBody);

      setCurrentStep('submitted');
    } catch (err) {
      if (uploadImageApiError || submitReportApiError) {
      } else if (err instanceof Error) {
        setReportError(err.message);
      } else {
        setReportError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [clearUploadImageError, clearSubmitReportError, isAuthenticated, itemPhotos, reportReason, reportType, selectedUser, selectedItem, submitReportApi, uploadImageApi, uploadImageApiError, submitReportApiError]);

  const overallError = uploadImageApiError || submitReportApiError || reportError;

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
            {isAdmin && (
              <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <Link href="/reports/all" className="w-full flex items-center justify-center p-6 bg-yellow-500/20 dark:bg-yellow-400/20 rounded-xl shadow-lg hover:shadow-xl transition-shadow active:scale-95 text-yellow-600 dark:text-yellow-300 border border-yellow-500/30">
                  <Crown size={32} className="mr-4" />
                  <span className="text-lg font-semibold">Ver todos los reportes</span>
                </Link>
              </div>
            )}
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
                  <input type="text" id="searchTermUsers" value={searchTermUsers} onChange={(e) => setSearchTermUsers(e.target.value)} placeholder="Nombre, BGG user o email" className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                {selectedUser && (
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-200">
                    <span>Usuario seleccionado: <span className="font-semibold">{selectedUser.first_name} {selectedUser.last_name} {selectedUser.bgg_user && `(${selectedUser.bgg_user})`}</span></span>
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
                        {user.first_name} {user.last_name} {user.bgg_user && `(${user.bgg_user})`}
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
                        onClickCapture={(e) => { e.stopPropagation(); handleClearPhoto(index); }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 transition-colors focus:ring-2 focus:ring-white"
                        aria-label={`Quitar foto ${index + 1}`}
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
              <div className="mb-4">
                <label htmlFor="reportReason" className="sr-only">Motivo del Reporte</label>
                <textarea id="reportReason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={4} required placeholder="Ej: El usuario no se presentó, llegó tarde, etc." className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"></textarea>
              </div>
              <button type="submit" disabled={isProcessing} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 flex justify-center items-center">
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {processingMessage || 'Enviando...'}
                  </>
                ) : 'Enviar Reporte'}
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
          {overallError && <p className="text-red-500 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/30 rounded-md">{overallError}</p>}
        </div>
      </section>

      <FullScreenImageModal
        imageUrl={fullScreenPhoto}
        onClose={() => setFullScreenPhoto(null)}
      />
    </main>
  );
}
