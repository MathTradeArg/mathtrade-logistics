import { EXPORT_MESSAGES, xlsxFileName, useXlsxExport } from './useXlsxExport';

export { EXPORT_MESSAGES };

/** `planilla_evento_AAAA-MM-DD_HHMM.xlsx` in the browser's local time. */
export const exportFileName = (at: Date) => xlsxFileName('planilla_evento', at);

/** Admin download of the three-sheet event workbook (`logistics/export/operational/`). */
export const useOperationalExport = () => useXlsxExport('operational', 'planilla_evento');
