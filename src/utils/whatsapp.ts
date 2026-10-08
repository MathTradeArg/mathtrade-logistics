/* A user's WhatsApp is their phone (the backend sends phone, or the legacy
 * whatsapp value when the phone is empty), typed in any format. wa.me needs
 * the international number in digits only. Same rule as web-ui
 * src/utils/whatsapp.ts:
 * - Starts with 54: already international, kept as is.
 * - Otherwise: a local Argentine mobile; drop the trunk 0 and prefix 549. */
export const normalizeWhatsapp = (value: string | null | undefined): string => {
  const digits = `${value ?? ''}`.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('54')) return digits;
  return `549${digits.replace(/^0+/, '')}`;
};

/** wa.me link for a phone/WhatsApp value, or '' when it has no digits. */
export const whatsappLink = (value: string | null | undefined): string => {
  const number = normalizeWhatsapp(value);
  return number ? `https://wa.me/${number}` : '';
};
