/* eslint-disable @next/next/no-img-element */
"use client";

import { FullScreenImageModal } from '@/components/common';
import { LoadingSpinner } from '@/components/common/ui';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import { StaffPage } from '@/components/staff';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { generateHashedFilename } from '@/utils/file';
import { compressImage } from '@/utils/imageCompressor';
import { triggerHaptic } from '@/utils/haptics';
import { ChangeEvent, FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { missingReportComment } from './missingReport';

const normalizeSearchString = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Error al leer el archivo de imagen.'));
    };
    reader.onerror = (error) => reject(error);
  });

interface Item {
  item_id: number;
  id: number;
  title: string;
  assigned_trade_code: number;
}

type ReportStep = 'initial' | 'find_item' | 'find_user' | 'take_photo' | 'describe_problem' | 'submitted';

function NewReportContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preloadedBoxId = Number(searchParams.get('box') || 0) || null;
  const preloadedItemId = Number(searchParams.get('item') || 0) || null;
  const isMissing = searchParams.get('kind') === 'missing' || Boolean(preloadedBoxId);
  const [currentStep, setCurrentStep] = useState<ReportStep>(isMissing ? 'describe_problem' : 'initial');
  const [reportType, setReportType] = useState<'item' | 'user' | null>(isMissing ? 'item' : null);
  const [searchTermItems, setSearchTermItems] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(() => {
    if (!preloadedItemId) return null;
    return {
      item_id: preloadedItemId,
      id: preloadedItemId,
      title: searchParams.get('title') || `Item ${preloadedItemId}`,
      assigned_trade_code: Number(searchParams.get('code') || 0),
    };
  });
  const [selectedUser, setSelectedUser] = useState<{ id: number; first_name: string; last_name: string } | null>(null);
  const [selectedBoxId] = useState<number | null>(preloadedBoxId);
  const [itemPhotos, setItemPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reportReason, setReportReason] = useState(() => (
    isMissing && preloadedBoxId
      ? missingReportComment({
          boxId: preloadedBoxId,
          boxNumber: searchParams.get('boxNumber') ? Number(searchParams.get('boxNumber')) : null,
          originName: searchParams.get('origin') || undefined,
          itemId: preloadedItemId,
          title: searchParams.get('title') || undefined,
          code: searchParams.get('code') || undefined,
          codes: searchParams.get('codes') || undefined,
        })
      : ''
  ));
  const [reportError, setReportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);

  const { data: availableItems, isLoading: isLoadingItems, error: errorItems, execute: fetchAvailableItems } = useApi<Item[]>('logistics/items');
  const { execute: uploadImageApi, clearError: clearUploadImageError } = useApi<any>('users/images/', { method: 'POST' });
  const { execute: submitReportApi, clearError: clearSubmitReportError } = useApi<any>('reports/', { method: 'POST' });

  const resetForm = () => {
    setCurrentStep('initial');
    setReportType(null);
    setSearchTermItems('');
    setSelectedItem(null);
    setSelectedUser(null);
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setItemPhotos([]);
    setPhotoPreviews([]);
    setReportReason('');
    setReportError('');
    setIsProcessing(false);
    setProcessingMessage('');
    clearUploadImageError();
    clearSubmitReportError();
    router.replace('/more/report');
  };

  useEffect(() => {
    if (currentStep === 'find_item' && !availableItems && !isLoadingItems && !errorItems) {
      fetchAvailableItems();
    }
  }, [currentStep, availableItems, isLoadingItems, errorItems, fetchAvailableItems]);

  const filteredItems = useMemo(() => {
    const items = availableItems || [];
    if (!searchTermItems.trim()) return items;
    const term = normalizeSearchString(searchTermItems);
    return items.filter((item) =>
      normalizeSearchString(item.title).includes(term) ||
      item.assigned_trade_code.toString().includes(searchTermItems.toLowerCase()),
    );
  }, [availableItems, searchTermItems]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).map((file) =>
      new File([file], generateHashedFilename(file.name), { type: file.type, lastModified: file.lastModified }),
    );
    setItemPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const handleFindSubmit = (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic(20);
    setReportError('');
    if (reportType === 'item') {
      if (!selectedItem) {
        setReportError('Por favor, seleccioná un ítem.');
        return;
      }
      setCurrentStep('take_photo');
    } else {
      if (!selectedUser) {
        setReportError('Por favor, seleccioná un usuario.');
        return;
      }
      setCurrentStep('describe_problem');
    }
  };

  const handleReportSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic(25);
    setReportError('');
    if (!isAuthenticated) {
      setReportError('No autenticado. No se puede enviar el reporte.');
      return;
    }
    setIsProcessing(true);
    try {
      const uploadedImageIds: string[] = await Promise.all(
        itemPhotos.map(async (photo, index) => {
          setProcessingMessage(`Comprimiendo imagen ${index + 1}/${itemPhotos.length}...`);
          const compressedPhoto = await compressImage(photo);
          if (compressedPhoto.size > 500 * 1024) {
            throw new Error(`La imagen '${photo.name}' no pudo ser comprimida por debajo de 500KB.`);
          }
          setProcessingMessage(`Subiendo imagen ${index + 1}/${itemPhotos.length}...`);
          const imgCode = await fileToBase64(compressedPhoto);
          const imageUploadResult = await uploadImageApi({ img_code: imgCode });
          if (imageUploadResult && imageUploadResult.asset_url) return imageUploadResult.asset_url;
          if (typeof imageUploadResult === 'string') return imageUploadResult;
          throw new Error(`Respuesta inesperada al subir la imagen '${photo.name}'.`);
        }),
      );
      setProcessingMessage('Enviando reporte...');
      const reportBody: { comment: string; reported_user?: number; item?: number; images?: string; box?: number } = {
        comment: reportReason,
      };
      if (reportType === 'user' && selectedUser) reportBody.reported_user = selectedUser.id;
      else if (reportType === 'item' && selectedItem) reportBody.item = selectedItem.item_id;
      if (selectedBoxId) reportBody.box = selectedBoxId;
      if (uploadedImageIds.length > 0) reportBody.images = uploadedImageIds.join(',');
      await submitReportApi(reportBody);
      setCurrentStep('submitted');
    } catch (err) {
      const errorBody = (err as { body?: { item?: string[] } })?.body;
      if (errorBody && Array.isArray(errorBody.item) && errorBody.item.includes('reported item with this item already exists.')) {
        setReportError('Ya existe un reporte para este ítem. No se puede crear un nuevo reporte.');
      } else if (err instanceof Error) {
        setReportError(err.message);
      } else {
        setReportError('Ocurrió un error inesperado. Por favor, intente de nuevo.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [isAuthenticated, itemPhotos, reportReason, reportType, selectedUser, selectedItem, selectedBoxId, submitReportApi, uploadImageApi]);

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Validando sesión..." /></div>;
  }

  return (
    <StaffPage>
      {currentStep === 'initial' && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => { setReportType('item'); setCurrentStep('find_item'); }} className="min-h-14 rounded-lg bg-white px-4 text-left font-medium">Un ítem</button>
          <button type="button" onClick={() => { setReportType('user'); setCurrentStep('find_user'); }} className="min-h-14 rounded-lg bg-white px-4 text-left font-medium">Un usuario</button>
        </div>
      )}

      {currentStep === 'find_item' && (
        <form onSubmit={handleFindSubmit} className="space-y-4">
          {isLoadingItems ? <LoadingSpinner message="Cargando ítems..." /> : errorItems ? <p className="text-danger">{errorItems}</p> : (
            <>
              <input
                type="search"
                value={searchTermItems}
                onChange={(e) => setSearchTermItems(e.target.value)}
                placeholder="Título o número de etiqueta"
                className="min-h-14 w-full rounded-lg border border-gray-200 bg-white px-4"
              />
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {filteredItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`min-h-14 w-full rounded-lg px-4 text-left ${selectedItem?.id === item.id ? 'bg-primary text-white' : 'bg-white'}`}
                    >
                      {item.title} (#{item.assigned_trade_code})
                    </button>
                  </li>
                ))}
              </ul>
              <button type="submit" disabled={!selectedItem} className="min-h-14 w-full rounded-lg bg-primary font-semibold text-white disabled:bg-cancel">Siguiente</button>
            </>
          )}
        </form>
      )}

      {currentStep === 'find_user' && (
        <form onSubmit={handleFindSubmit} className="space-y-4">
          {selectedUser ? (
            <p className="rounded-lg bg-white px-4 py-3 font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
          ) : (
            <MemberNameSearch onSelect={(member) => setSelectedUser({ id: member.user_id, first_name: member.first_name, last_name: member.last_name })} />
          )}
          <button type="submit" disabled={!selectedUser} className="min-h-14 w-full rounded-lg bg-primary font-semibold text-white disabled:bg-cancel">Siguiente</button>
        </form>
      )}

      {currentStep === 'take_photo' && (
        <div className="space-y-4">
          <input type="file" id="itemPhoto" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" ref={fileInputRef} multiple />
          <label htmlFor="itemPhoto" className="flex min-h-14 items-center justify-center rounded-lg bg-primary font-semibold text-white">
            {photoPreviews.length > 0 ? 'Añadir más fotos' : 'Seleccionar foto(s)'}
          </label>
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {photoPreviews.map((previewUrl, index) => (
                <button key={previewUrl} type="button" onClick={() => setFullScreenPhoto(previewUrl)}>
                  <img src={previewUrl} alt={`Vista previa ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setCurrentStep('describe_problem')} className="min-h-14 w-full rounded-lg bg-primary font-semibold text-white">Siguiente</button>
        </div>
      )}

      {currentStep === 'describe_problem' && (
        <form onSubmit={handleReportSubmit} className="space-y-4">
          {(selectedBoxId || selectedItem) && (
            <div className="staff-card p-4 text-sm text-gray-700">
              {selectedBoxId && <p>Caja id {selectedBoxId}{searchParams.get('boxNumber') ? ` · #${searchParams.get('boxNumber')}` : ''}</p>}
              {selectedItem && (
                <p>
                  Juego id {selectedItem.item_id}
                  {selectedItem.assigned_trade_code ? ` · #${selectedItem.assigned_trade_code}` : ''}
                  {selectedItem.title ? ` · ${selectedItem.title}` : ''}
                </p>
              )}
            </div>
          )}
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
            required
            placeholder="Describí el problema"
            className="w-full rounded-lg border border-gray-200 bg-white p-4"
          />
          <button type="submit" disabled={isProcessing} className="min-h-14 w-full rounded-lg bg-primary font-semibold text-white disabled:bg-cancel">
            {isProcessing ? (processingMessage || 'Enviando...') : 'Enviar reporte'}
          </button>
        </form>
      )}

      {currentStep === 'submitted' && (
        <div className="rounded-lg bg-white p-6 text-center">
          <p className="text-lg font-bold">Reporte enviado</p>
          <button type="button" onClick={resetForm} className="mt-6 min-h-14 w-full rounded-lg bg-primary font-semibold text-white">Crear otro reporte</button>
        </div>
      )}

      {reportError && <p className="mt-4 text-center text-danger">{reportError}</p>}
      <FullScreenImageModal imageUrl={fullScreenPhoto} onClose={() => setFullScreenPhoto(null)} />
    </StaffPage>
  );
}

export default function NewReportPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
      <NewReportContent />
    </Suspense>
  );
}
