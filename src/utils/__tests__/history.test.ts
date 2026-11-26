import type { GameStatusCode } from '@/types';
import { actorName, formatHistoryDate, previousStatuses, statusChangeText } from '../history';

type Row = { game: number; status: GameStatusCode };

describe('previousStatuses', () => {
  it('pairs each row with the next older row of the same game', () => {
    // Newest first, two games mixed.
    const rows: Row[] = [
      { game: 1, status: 6 },
      { game: 2, status: 5 },
      { game: 1, status: 5 },
      { game: 2, status: 2 },
      { game: 1, status: 2 },
    ];
    expect(previousStatuses(rows, (r) => r.game)).toEqual([5, 2, 2, null, null]);
  });

  it('returns null for the oldest row', () => {
    expect(previousStatuses([{ game: 1, status: 2 }], (r) => r.game)).toEqual([null]);
  });

  it('keeps a repeated status as is, without deducing anything', () => {
    const rows: Row[] = [{ game: 1, status: 6 }, { game: 1, status: 6 }];
    const previous = previousStatuses(rows, (r) => r.game);
    expect(previous).toEqual([6, null]);
    expect(statusChangeText(rows[0].status, previous[0])).toBe('Entregado a Usuario → Entregado a Usuario');
  });
});

describe('statusChangeText', () => {
  it('shows only the status when there is no previous one', () => {
    expect(statusChangeText(2, null)).toBe('En viaje al evento');
  });

  it('shows "previous → current"', () => {
    expect(statusChangeText(6, 5)).toBe('En evento → Entregado a Usuario');
  });
});

describe('actorName', () => {
  it('names a missing actor', () => {
    expect(actorName(null)).toBe('Alguien (sin nombre)');
  });

  it('names an actor with a blank name', () => {
    expect(actorName({ name: '  ' })).toBe('Alguien (sin nombre)');
  });

  it('returns the actor name', () => {
    expect(actorName({ name: 'Ana Gomez' })).toBe('Ana Gomez');
  });
});

describe('formatHistoryDate', () => {
  it('returns the input when it is not a date', () => {
    expect(formatHistoryDate('no-date')).toBe('no-date');
  });

  it('formats day, month, hour and minute', () => {
    const text = formatHistoryDate('2026-11-26T15:04:00Z');
    expect(text).toMatch(/\d{2}\/\d{2}/);
    expect(text).toMatch(/\d{2}:\d{2}/);
  });
});
