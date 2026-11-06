export type SheetRow = Record<string, string | number>;

export type Cell = string | number;
export type WorkbookSheet =
  | { name: string; rows: SheetRow[] }
  | { name: string; aoa: Cell[][] };

/** Column widths from the longest cell of each column (+2, capped at 60). */
function columnWidths(grid: Cell[][]): { wch: number }[] {
  const widths: number[] = [];
  grid.forEach((row) => row.forEach((cell, index) => {
    const length = `${cell ?? ''}`.length;
    widths[index] = Math.max(widths[index] ?? 0, length);
  }));
  return widths.map((width) => ({ wch: Math.min(width + 2, 60) }));
}

/** Builds a workbook with one sheet per entry (`rows`: keys = header row;
 *  `aoa`: raw grid). SheetJS loads on demand, so it stays out of the pages'
 *  bundles. */
export async function buildWorkbook(sheets: WorkbookSheet[]) {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    let worksheet;
    let grid: Cell[][];
    if ('aoa' in sheet) {
      grid = sheet.aoa;
      worksheet = XLSX.utils.aoa_to_sheet(sheet.aoa);
    } else {
      grid = sheet.rows.length > 0
        ? [Object.keys(sheet.rows[0]), ...sheet.rows.map((row) => Object.values(row))]
        : [];
      worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    }
    worksheet['!cols'] = columnWidths(grid);
    XLSX.utils.book_append_sheet(book, worksheet, sheet.name.slice(0, 31));
  });
  return book;
}

/** Downloads the sheets as one .xlsx. Only writes files: the open SheetJS
 *  advisories are about parsing them. */
export async function downloadWorkbook(sheets: WorkbookSheet[], fileName: string): Promise<void> {
  const XLSX = await import('xlsx');
  XLSX.writeFile(await buildWorkbook(sheets), fileName);
}

/** Downloads `rows` as a one-sheet .xlsx (keys = header row). */
export async function downloadSheet(rows: SheetRow[], fileName: string, sheetName = 'Hoja1'): Promise<void> {
  await downloadWorkbook([{ name: sheetName, rows }], fileName);
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
