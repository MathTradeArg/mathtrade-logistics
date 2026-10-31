import { boxFetch, BoxApiError } from '@/hooks/boxes/boxApi';
import type { Tracking } from '@/types';
import { fileToBase64 } from '@/utils/file';
import { compressImage } from '@/utils/imageCompressor';

/** Body of POST/PUT logistics/trackings/. Box ids must be closed boxes of
 *  the own city (the backend checks it). */
export type TrackingInput = {
  destiny: number;
  tracking_code: string;
  boxes: number[];
  weight: number;
  price: string;
  image: string;
};

export const RECEIPT_MAX_BYTES = 500 * 1024;

/** The city's shipments (own origin); `destination` narrows them. */
export async function listTrackings(params: { destination?: number } = {}): Promise<Tracking[]> {
  const query = params.destination ? `?destination=${params.destination}` : '';
  const data = await boxFetch<Tracking[]>(`logistics/trackings/${query}`);
  return Array.isArray(data) ? data : [];
}

export async function getTracking(id: number): Promise<Tracking> {
  const data = await boxFetch<Tracking>(`logistics/trackings/${id}/`);
  if (!data) throw new BoxApiError('Envío no encontrado.', 404, null);
  return data;
}

export async function saveTracking(body: TrackingInput, id?: number): Promise<Tracking> {
  const data = await boxFetch<Tracking>(
    id ? `logistics/trackings/${id}/` : 'logistics/trackings/',
    { method: id ? 'PUT' : 'POST', body },
  );
  if (!data) throw new BoxApiError('No se recibió el envío guardado.', 500, null);
  return data;
}

/** The boxes stay closed and without a shipment (the backend detaches them). */
export async function deleteTracking(id: number): Promise<void> {
  await boxFetch(`logistics/trackings/${id}/`, { method: 'DELETE' });
}

/** Compresses and uploads a receipt photo; resolves with its URL. */
export async function uploadReceipt(file: File): Promise<string> {
  const compressed = await compressImage(file);
  if (compressed.size > RECEIPT_MAX_BYTES) {
    throw new Error('La imagen no pudo comprimirse por debajo de 500KB.');
  }
  const imgCode = await fileToBase64(compressed);
  const data = await boxFetch<{ asset_url?: string } | string>('users/images/', {
    method: 'POST',
    body: { img_code: imgCode },
  });
  if (typeof data === 'string') return data;
  if (data?.asset_url) return data.asset_url;
  throw new Error('Respuesta inesperada al subir la imagen.');
}
