export type SheetRow = Record<string, string | number>;

/** Downloads `rows` as a one-sheet .xlsx (keys = header row). SheetJS loads
 *  on demand, so it stays out of the pages' bundles. Only writes files: the
 *  open SheetJS advisories are about parsing them. */
export async function downloadSheet(rows: SheetRow[], fileName: string, sheetName = 'Hoja1'): Promise<void> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(book, fileName);
}

/** A file-name-safe slug of a city name ("San Martín" -> "san_martin"). */
export function fileSlug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'ciudad'
  );
}
