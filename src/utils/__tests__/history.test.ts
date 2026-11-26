import type { ActivityRow, GameStatusCode, UserHistoryRow } from '@/types';
import {
  activityKey, activityTitle, actorName, BOX_ACTION_LABEL, boxEventGameText, formatHistoryDate, previousStatuses,
  statusChangeText,
} from '../history';

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

describe('boxEventGameText', () => {
  it('shows the game with its padded label', () => {
    expect(boxEventGameText({ action: 'add', trade_code: 501, game_title: 'Catan' })).toBe('Catan (00501)');
  });

  it('falls back to "Sin título" when the game has a code but no title', () => {
    expect(boxEventGameText({ action: 'remove', trade_code: 12345, game_title: null })).toBe('Sin título (12345)');
  });

  it('returns null for box actions that are not about a game', () => {
    for (const action of ['create', 'close', 'reopen', 'delete'] as const) {
      expect(boxEventGameText({ action, trade_code: null, game_title: null })).toBeNull();
    }
  });

  it('says "Juego no disponible" when a game action lost its game', () => {
    for (const action of ['add', 'remove', 'move_in', 'move_out'] as const) {
      expect(boxEventGameText({ action, trade_code: null, game_title: null })).toBe('Juego no disponible');
    }
  });
});

describe('BOX_ACTION_LABEL', () => {
  it('has a label for every action', () => {
    expect(BOX_ACTION_LABEL.create).toBe('Creó la caja');
    expect(BOX_ACTION_LABEL.reopen).toBe('Reabrió la caja');
    expect(Object.keys(BOX_ACTION_LABEL)).toHaveLength(8);
  });
});

describe('activityTitle / activityKey', () => {
  const actor = { id: 70, name: 'Ana Gomez' };
  const tradeRow: ActivityRow = {
    kind: 'trade', id: 3, status: 5, status_display: 'In Event', actor, at: '2026-11-26T15:00:00Z',
    trade_id: 11, trade_code: 101, game_title: 'Catan',
  };
  const boxRow: ActivityRow = {
    kind: 'box', id: 3, action: 'close', box_id: 392, trade_id: null, trade_code: null, game_title: null,
    actor, at: '2026-11-26T14:00:00Z',
  };

  it('shows the game, its label and the new status for a game row', () => {
    expect(activityTitle(tradeRow)).toBe('Catan (00101): En evento');
    expect(activityTitle({ ...tradeRow, game_title: null })).toBe('Sin título (00101): En evento');
  });

  it('shows the action and the box for a box row without a game', () => {
    expect(activityTitle(boxRow)).toBe('Cerró la caja (caja 392)');
  });

  it('adds the game to a box row about a game', () => {
    expect(activityTitle({ ...boxRow, action: 'add', trade_id: 11, trade_code: 101, game_title: 'Catan' }))
      .toBe('Agregó un juego (caja 392) · Catan (00101)');
    expect(activityTitle({ ...boxRow, action: 'remove' })).toBe('Sacó un juego (caja 392) · Juego no disponible');
  });

  it('keys rows by kind so ids of both tables do not collide', () => {
    expect(activityKey(tradeRow)).toBe('trade-3');
    expect(activityKey(boxRow)).toBe('box-3');
  });
});

describe('previousStatuses on a participant history', () => {
  it('pairs rows by game (trade_id), whatever the role', () => {
    const base = { status_display: '', actor: null, at: '2026-11-26T15:00:00Z', game_title: 'Catan' };
    const rows: UserHistoryRow[] = [
      { ...base, id: 4, trade_id: 20, trade_code: 202, role: 'receives', status: 6 },
      { ...base, id: 3, trade_id: 10, trade_code: 101, role: 'gives', status: 5 },
      { ...base, id: 2, trade_id: 20, trade_code: 202, role: 'receives', status: 5 },
      { ...base, id: 1, trade_id: 10, trade_code: 101, role: 'gives', status: 2 },
    ];
    expect(previousStatuses(rows, (r) => r.trade_id)).toEqual([5, 2, null, null]);
  });
});
