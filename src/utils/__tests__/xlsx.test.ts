import * as XLSX from 'xlsx';
// Real SheetJS (builders run for real); only the file write is stubbed.
jest.mock('xlsx', () => ({ ...jest.requireActual('xlsx'), writeFile: jest.fn() }));

import { buildWorkbook, downloadSheet, downloadWorkbook, fileSlug } from '../xlsx';

describe('buildWorkbook', () => {
  it('builds one sheet per entry with real content', async () => {
    const book = await buildWorkbook([
      { name: 'Por destino', aoa: [['Código', 'Juego'], ['Rosario · 1 juego'], ['00012', 'Catan']] },
      { name: 'Total', rows: [{ Código: '00012', Juego: 'Catan' }, { Código: '00013', Juego: 'Azul' }] },
    ]);
    expect(book.SheetNames).toEqual(['Por destino', 'Total']);
    expect(XLSX.utils.sheet_to_json(book.Sheets['Por destino'], { header: 1 })).toEqual([
      ['Código', 'Juego'], ['Rosario · 1 juego'], ['00012', 'Catan'],
    ]);
    expect(XLSX.utils.sheet_to_json(book.Sheets['Total'])).toEqual([
      { Código: '00012', Juego: 'Catan' }, { Código: '00013', Juego: 'Azul' },
    ]);
  });

  it('truncates sheet names to 31 characters', async () => {
    const book = await buildWorkbook([{ name: 'x'.repeat(40), rows: [{ a: 1 }] }]);
    expect(book.SheetNames[0]).toHaveLength(31);
  });

  it('sizes columns by the longest cell, capped at 60', async () => {
    const book = await buildWorkbook([
      { name: 'A', aoa: [['ab', 'x'.repeat(100)], ['abcdef', 'y']] },
      { name: 'B', rows: [{ Juego: 'Catan' }] },
    ]);
    expect(book.Sheets['A']['!cols']).toEqual([{ wch: 8 }, { wch: 60 }]);
    expect(book.Sheets['B']['!cols']).toEqual([{ wch: 7 }]);
  });
});

describe('downloadWorkbook / downloadSheet', () => {
  const writeFile = XLSX.writeFile as jest.Mock;
  beforeEach(() => writeFile.mockClear());

  it('writes the workbook under the file name', async () => {
    await downloadWorkbook([{ name: 'A', rows: [{ a: 1 }] }, { name: 'B', rows: [{ b: 2 }] }], 'f.xlsx');
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile.mock.calls[0][0].SheetNames).toEqual(['A', 'B']);
    expect(writeFile.mock.calls[0][1]).toBe('f.xlsx');
  });

  it('downloadSheet still writes a one-sheet file', async () => {
    await downloadSheet([{ a: 1 }], 'g.xlsx', 'Hoja');
    const [book, name] = writeFile.mock.calls[0];
    expect(book.SheetNames).toEqual(['Hoja']);
    expect(XLSX.utils.sheet_to_json(book.Sheets['Hoja'])).toEqual([{ a: 1 }]);
    expect(name).toBe('g.xlsx');
  });
});

describe('fileSlug', () => {
  it('slugs city names', () => {
    expect(fileSlug('San Martín')).toBe('san_martin');
  });
});
