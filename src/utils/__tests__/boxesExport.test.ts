import type { Item } from '@/types';
import * as XLSX from 'xlsx';
import { buildBoxesExport } from '../boxesExport';
import { buildWorkbook } from '../xlsx';

const SANTA_FE = 5;
const ESPERANZA = 6;
const base = { status: 2 };
const items: Item[] = [
  // direct to Rosario, boxed
  { ...base, id: 1, title: 'Catan', assigned_trade_code: 12, first_name: 'Ana', last_name: 'Paz', location: 9, location_name: 'Rosario', box_number: 3 },
  // direct to Rosario, not boxed, giver without last name
  { ...base, id: 2, title: 'Azul', assigned_trade_code: 7, first_name: 'Beto', location: 9, location_name: 'Rosario' },
  // to AMBA itself
  { ...base, id: 3, title: 'Root', assigned_trade_code: 20, first_name: 'Cris', last_name: 'Gil', location: 1, location_name: 'AMBA' },
  // via meeting to Salta
  { ...base, id: 4, title: 'Dune', assigned_trade_code: 16120, first_name: 'Dani', last_name: 'Ruiz', location: 15, location_name: 'Salta', via_meeting: true },
  // stays in Santa Fe
  { ...base, id: 5, title: 'Local', assigned_trade_code: 30, location: SANTA_FE, location_name: 'Santa Fe' },
  // to Esperanza, shipped as Santa Fe: intra
  { ...base, id: 6, title: 'Esp', assigned_trade_code: 31, location: ESPERANZA, location_name: 'Esperanza', send_to: SANTA_FE, lane_destination: SANTA_FE },
  // giver from Esperanza (send_as of Santa Fe) to another city: kept
  { ...base, id: 7, title: 'Viaja', assigned_trade_code: 40, first_name: 'Eva', last_name: 'Sosa', location: 9, location_name: 'Rosario', origin_location: ESPERANZA },
];

const sheets = buildBoxesExport(items, SANTA_FE);
const byName = (name: string) => sheets.find((s) => s.name === name)!;

describe('buildBoxesExport', () => {
  it('names the two sheets', () => {
    expect(sheets.map((s) => s.name)).toEqual(['Por destino', 'Total']);
  });

  it('Total lists the non-intra games by code, with the 5 columns', () => {
    const rows = (byName('Total') as { rows: Record<string, string | number>[] }).rows;
    expect(rows.map((r) => r['Código'])).toEqual(['00007', '00012', '00020', '00040', '16120']);
    expect(rows[0]).toEqual({
      Código: '00007', Juego: 'Azul', Entregador: 'Beto', Destino: 'Rosario', Carril: 'Directo',
    });
    expect(rows.map((r) => r['Carril'])).toEqual(['Directo', 'Directo', 'AMBA', 'Directo', 'Vía reunión']);
    expect(rows.find((r) => r['Juego'] === 'Dune')!['Destino']).toBe('Salta · Vía AMBA');
  });

  it('keeps giver "—" when the copy has no name', () => {
    const rows = (byName('Total') as { rows: Record<string, string | number>[] }).rows;
    expect(rows.find((r) => r['Juego'] === 'Root')!['Entregador']).toBe('Cris Gil');
  });

  it('Por destino: title rows with counts, direct first then AMBA/via, blank between groups', () => {
    const aoa = (byName('Por destino') as { aoa: (string | number)[][] }).aoa;
    expect(aoa).toEqual([
      ['Código', 'Juego', 'Entregador', 'Destino', 'Carril'],
      ['Rosario · 3 juegos'],
      ['00007', 'Azul', 'Beto', 'Rosario', 'Directo'],
      ['00012', 'Catan', 'Ana Paz', 'Rosario', 'Directo'],
      ['00040', 'Viaja', 'Eva Sosa', 'Rosario', 'Directo'],
      [],
      ['AMBA · 1 juego'],
      ['00020', 'Root', 'Cris Gil', 'AMBA', 'AMBA'],
      [],
      ['Otras ciudades · Vía AMBA · 1 juego'],
      ['16120', 'Dune', 'Dani Ruiz', 'Salta · Vía AMBA', 'Vía reunión'],
      [],
    ]);
  });

  it('excludes intra-locality games, send_as cities included', () => {
    const rows = (byName('Total') as { rows: Record<string, string | number>[] }).rows;
    expect(rows.map((r) => r['Juego'])).not.toEqual(expect.arrayContaining(['Local']));
    expect(rows.map((r) => r['Juego'])).not.toEqual(expect.arrayContaining(['Esp']));
  });

  it('produces a real workbook', async () => {
    const book = await buildWorkbook(sheets);
    expect(book.SheetNames).toEqual(['Por destino', 'Total']);
    expect(XLSX.utils.sheet_to_json(book.Sheets['Total'])).toHaveLength(5);
  });
});
