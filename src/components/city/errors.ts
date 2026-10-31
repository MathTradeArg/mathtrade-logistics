/** A readable message from a boxFetch/useApi error: DRF field errors live in
 *  `err.body` (`{boxes: ['…']}`), `detail` in `err.message`. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { body?: unknown } | null)?.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const parts = Object.entries(body as Record<string, unknown>)
      .filter(([key]) => key !== 'detail' && key !== 'message')
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '');
    if (parts.length > 0) return parts.join(' ');
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
