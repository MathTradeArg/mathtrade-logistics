import { boxFetch, BoxApiError, queryString, type CityViewParams } from '@/hooks/boxes/boxApi';
import type { CityMember, CityRef, MathtradeRef, Tracking } from '@/types';
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

/** Lists come plain, or paginated as {results} on some endpoints. */
function rows<T>(data: T[] | { results?: T[] } | undefined): T[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

/** The city's shipments (own origin). `destination` = the own city lists
 *  what ships to it (Recibidas); another destination narrows the own ones. */
export async function listTrackings(
  params: CityViewParams & { destination?: number } = {},
): Promise<Tracking[]> {
  const data = await boxFetch<Tracking[]>(`logistics/trackings/${queryString(params)}`);
  return Array.isArray(data) ? data : [];
}

export async function getTracking(id: number, params: CityViewParams = {}): Promise<Tracking> {
  const data = await boxFetch<Tracking>(`logistics/trackings/${id}/${queryString(params)}`);
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

/** api/locations/: id and name of every city (the admin "Ver como" picker). */
export async function listLocations(): Promise<CityRef[]> {
  const data = await boxFetch<CityRef[] | { results?: CityRef[] }>('locations/');
  return rows(data)
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** api/mathtrades/ (newest first): editions the user may see. */
export async function listMathtrades(): Promise<MathtradeRef[]> {
  const data = await boxFetch<MathtradeRef[] | { results?: MathtradeRef[] }>('mathtrades/');
  return rows(data).map(({ id, name, active }) => ({ id, name, active: Boolean(active) }));
}

/** The active edition's id, or null when there is none. */
export async function getActiveMathtradeId(): Promise<number | null> {
  const editions = await listMathtrades();
  return editions.find((mt) => mt.active)?.id ?? null;
}

/** Members of one city in an edition (mathtrades/<id>/users/?location=).
 *  The backend picks the keys: 16 for the city's referrer, 14 for an admin,
 *  13 (phone, telegram) for a local volunteer of the city. */
export async function listCityMembers(mathtradeId: number, cityId: number): Promise<CityMember[]> {
  const data = await boxFetch<CityMember[] | { results?: CityMember[] }>(
    `mathtrades/${mathtradeId}/users/${queryString({ location: cityId })}`,
  );
  return rows(data);
}
