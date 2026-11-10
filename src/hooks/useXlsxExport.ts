import { downloadBlob } from '@/utils/file';
import { apiErrorMessage, fetchWithTimeout, NETWORK_ERROR_MESSAGE } from '@/utils/fetchWithTimeout';
import { useCallback, useRef, useState } from 'react';

// gunicorn kills a worker at 30 s and CloudFront cuts at 60 s: waiting longer is useless.
const EXPORT_TIMEOUT_MS = 45000;

export const EXPORT_MESSAGES = {
  noToken: 'No se encontró el token de autenticación.',
  forbidden: 'Solo un organizador puede descargar la planilla.',
  noEdition: 'No hay una edición activa.',
  server: 'El servidor no pudo armar la planilla. Probá de nuevo en un minuto.',
  empty: 'La planilla vino vacía. Probá de nuevo.',
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** `<prefix>_AAAA-MM-DD_HHMM.xlsx` in the browser's local time. */
export const xlsxFileName = (prefix: string, at: Date) =>
  `${prefix}_${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}_${pad(at.getHours())}${pad(at.getMinutes())}.xlsx`;

/** The four per-purpose sheets of `/more` (endpoint under `logistics/export/` and file name prefix). */
export const EVENT_SHEETS = {
  incomingBoxes: { endpoint: 'incoming-boxes', filePrefix: 'cajas_entrantes' },
  outgoingGames: { endpoint: 'outgoing-games', filePrefix: 'juegos_que_salen' },
  toReceive: { endpoint: 'to-receive', filePrefix: 'juegos_a_recibir' },
  toDeliver: { endpoint: 'to-deliver', filePrefix: 'juegos_a_entregar' },
} as const;

/** Admin download of `logistics/export/<endpoint>/` (an .xlsx, not JSON, so
 *  not `useApi`). Each call of the hook has its own state. One attempt only: rebuilding the workbook is costly, the admin
 *  taps again. A call made while one is in flight is ignored. */
export function useXlsxExport(endpoint: string, filePrefix: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDownloadedAt, setLastDownloadedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const download = useCallback(async (): Promise<void> => {
    if (inFlight.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      setError(EXPORT_MESSAGES.noToken);
      return;
    }
    inFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout(
        `${process.env.NEXT_PUBLIC_MT_API_HOST}logistics/export/${endpoint}/`,
        { headers: { Authorization: `token ${token}` } },
        { timeoutMs: EXPORT_TIMEOUT_MS, retries: 0 },
      );
      if (!response.ok) {
        if (response.status === 403) setError(EXPORT_MESSAGES.forbidden);
        else if (response.status === 404) setError(EXPORT_MESSAGES.noEdition);
        else if (response.status >= 500) setError(EXPORT_MESSAGES.server);
        else {
          const body = await response.json().catch(() => null);
          setError(apiErrorMessage(body, `No se pudo descargar la planilla (${response.status}).`));
        }
        return;
      }
      const blob = await response.blob();
      if (blob.size === 0) {
        setError(EXPORT_MESSAGES.empty);
        return;
      }
      const now = new Date();
      downloadBlob(blob, xlsxFileName(filePrefix, now));
      setLastDownloadedAt(now);
    } catch {
      // NetworkError (no connection / 45 s timeout) or the body stalled mid-read.
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [endpoint, filePrefix]);

  return { download, isLoading, error, lastDownloadedAt };
}
