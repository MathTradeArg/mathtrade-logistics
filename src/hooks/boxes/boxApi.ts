import type { Box, Item } from '@/types';

const apiHost = () => process.env.NEXT_PUBLIC_MT_API_HOST || '';

export class BoxApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'BoxApiError';
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | undefined | null;

function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
}

export async function boxFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T | undefined> {
  const { method = 'GET', body, idempotencyKey } = options;
  const headers = authHeaders(
    idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  );

  const response = await fetch(`${apiHost()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `Request failed with status ${response.status}`,
    }));
    const message =
      (errorData as { message?: string; detail?: string }).message ||
      (errorData as { detail?: string }).detail ||
      `Error: ${response.statusText}`;
    throw new BoxApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json() as Promise<T>;
}

export type BoxListParams = {
  destination?: number;
  origin?: number;
  status?: 'open' | 'closed';
};

export async function listBoxes(params: BoxListParams = {}): Promise<Box[]> {
  const data = await boxFetch<Box[]>(`logistics/boxes/${queryString(params)}`);
  return Array.isArray(data) ? data : [];
}

export async function getBox(boxId: number): Promise<Box> {
  const data = await boxFetch<Box>(`logistics/boxes/${boxId}/`);
  if (!data) {
    throw new BoxApiError('Caja no encontrada.', 404, null);
  }
  return data;
}

export type ItemListParams = {
  destination?: number;
  origin?: number;
  excludeAmba?: number;
};

export async function listItems(params: ItemListParams = {}): Promise<Item[]> {
  const data = await boxFetch<Item[]>(
    `logistics/items/${queryString({
      destination: params.destination,
      origin: params.origin,
      exclude_amba: params.excludeAmba,
    })}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function openBox(destinationId: number, idempotencyKey: string): Promise<Box> {
  const data = await boxFetch<Box>('logistics/boxes/open/', {
    method: 'POST',
    body: { destination_id: destinationId },
    idempotencyKey,
  });
  if (!data) {
    throw new BoxApiError('No se recibió la caja creada.', 500, null);
  }
  return data;
}

export async function addItem(boxId: number, tradeId: number): Promise<Box> {
  const data = await boxFetch<Box>(`logistics/boxes/${boxId}/items/`, {
    method: 'POST',
    body: { trade_id: tradeId },
  });
  if (!data) {
    throw new BoxApiError('No se recibió la caja actualizada.', 500, null);
  }
  return data;
}

export async function removeItem(boxId: number, tradeId: number): Promise<void> {
  await boxFetch(`logistics/boxes/${boxId}/items/${tradeId}/`, { method: 'DELETE' });
}

export async function moveItem(boxId: number, tradeId: number, toBoxId: number): Promise<Box> {
  const data = await boxFetch<Box>(`logistics/boxes/${boxId}/move-item/`, {
    method: 'POST',
    body: { trade_id: tradeId, to_box_id: toBoxId },
  });
  if (!data) {
    throw new BoxApiError('No se recibió la caja destino.', 500, null);
  }
  return data;
}

export async function closeBox(boxId: number, idempotencyKey: string): Promise<Box> {
  const data = await boxFetch<Box>(`logistics/boxes/${boxId}/close/`, {
    method: 'POST',
    idempotencyKey,
  });
  if (!data) {
    throw new BoxApiError('No se recibió la caja cerrada.', 500, null);
  }
  return data;
}

export async function reopenBox(boxId: number): Promise<Box> {
  const data = await boxFetch<Box>(`logistics/boxes/${boxId}/reopen/`, { method: 'POST' });
  if (!data) {
    throw new BoxApiError('No se pudo reabrir la caja.', 500, null);
  }
  return data;
}

export async function deleteBox(boxId: number): Promise<void> {
  await boxFetch(`logistics/boxes/${boxId}/`, { method: 'DELETE' });
}

export async function markItemsReceived(
  assignedTradeCodes: number[],
  changeById: string | number | null,
): Promise<void> {
  await bulkUpdateTradeStatus(assignedTradeCodes, 5, changeById);
}

export async function bulkUpdateTradeStatus(
  assignedTradeCodes: number[],
  status: number,
  changeById: string | number | null,
): Promise<void> {
  await boxFetch('logistics/games/bulk-update-status/', {
    method: 'PATCH',
    body: {
      status,
      assigned_trade_codes: assignedTradeCodes,
      change_by_id: changeById,
    },
  });
}

export type AmbaPendingBox = {
  id: number;
  number: number | null;
  destination_id?: number;
  destination_name?: string;
  item_count?: number;
  pending_count?: number;
};

export type AmbaPendingTrade = {
  assigned_trade_code: number;
  title: string;
  recipient_first_name: string;
  recipient_last_name: string;
  box: {
    id: number;
    number: number | null;
    destination_id: number;
    destination_name: string;
  } | null;
};

export type AmbaPendingOrigin = {
  origin_id: number;
  origin_name: string;
  trades: AmbaPendingTrade[];
  transit_boxes: AmbaPendingBox[];
  unopened_amba_boxes: AmbaPendingBox[];
};

export async function listAmbaPending(): Promise<AmbaPendingOrigin[]> {
  const data = await boxFetch<AmbaPendingOrigin[]>('logistics/amba-pending/');
  return Array.isArray(data) ? data : [];
}
