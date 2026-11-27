import { callQueue } from '../callQueue';
import type { UserWithWindow } from '@/types/window';

const u = (id: number, status?: string | null, extra: Record<string, unknown> = {}) =>
  ({
    id,
    first_name: `N${id}`,
    last_name: 'A',
    username: `user${id}`,
    status,
    roles: [],
    ...extra,
  }) as unknown as UserWithWindow;

const ids = (list: UserWithWindow[]) => list.map((user) => user.id);

describe('callQueue', () => {
  it('fills up to N with the next people in line', () => {
    const users = [u(1, 'receiving'), u(2, 'present'), u(3, 'present'), u(4, 'present'), u(5, 'present'), u(6, 'present')];
    const result = callQueue(users, 4);
    expect(ids(result.calling)).toEqual([1, 2, 3, 4]);
    expect(ids(result.waiting)).toEqual([5, 6]);
  });

  it('keeps people at the table first, in list order, even when they are behind', () => {
    const users = [u(1, 'present'), u(2, 'receiving'), u(3, 'present'), u(4, 'receiving')];
    const result = callQueue(users, 3);
    expect(ids(result.calling)).toEqual([2, 4, 1]);
    expect(ids(result.waiting)).toEqual([3]);
  });

  it('drops receiving people beyond N from both lists', () => {
    const users = [u(1, 'receiving'), u(2, 'receiving'), u(3, 'receiving'), u(4, 'present')];
    const result = callQueue(users, 2);
    expect(ids(result.calling)).toEqual([1, 2]);
    expect(ids(result.waiting)).toEqual([4]);
  });

  it('returns empty lists for an empty input', () => {
    expect(callQueue([], 4)).toEqual({ calling: [], waiting: [] });
  });

  it('works with a single slot', () => {
    const withReceiving = callQueue([u(1, 'present'), u(2, 'receiving'), u(3, 'present')], 1);
    expect(ids(withReceiving.calling)).toEqual([2]);
    expect(ids(withReceiving.waiting)).toEqual([1, 3]);
    const withoutReceiving = callQueue([u(1, 'present'), u(2, 'present')], 1);
    expect(ids(withoutReceiving.calling)).toEqual([1]);
    expect(ids(withoutReceiving.waiting)).toEqual([2]);
  });

  it('treats null and undefined status as present', () => {
    const result = callQueue([u(1, null), u(2, undefined), u(3, 'present')], 2);
    expect(ids(result.calling)).toEqual([1, 2]);
    expect(ids(result.waiting)).toEqual([3]);
  });

  it('ignores staff', () => {
    const users = [u(1, 'present', { roles: ['volunteer'] }), u(2, 'receiving', { roles: ['admin'] }), u(3, 'present')];
    const result = callQueue(users, 4);
    expect(ids(result.calling)).toEqual([3]);
    expect(result.waiting).toEqual([]);
  });

  it('ignores completed', () => {
    const result = callQueue([u(1, 'completed'), u(2, 'present')], 4);
    expect(ids(result.calling)).toEqual([2]);
    expect(result.waiting).toEqual([]);
  });

  it('sends no_show to the back of the queue', () => {
    const users = [u(1, 'present'), u(10, 'no_show'), u(2, 'present'), u(11, 'no_show')];
    const two = callQueue(users, 2);
    expect(ids(two.calling)).toEqual([1, 2]);
    expect(ids(two.waiting)).toEqual([10, 11]);
    const three = callQueue(users, 3);
    expect(ids(three.calling)).toEqual([1, 2, 10]);
    expect(ids(three.waiting)).toEqual([11]);
    const mixed = callQueue([u(1, 'receiving'), u(2, 'present'), u(10, 'no_show')], 2);
    expect(ids(mixed.calling)).toEqual([1, 2]);
    expect(ids(mixed.waiting)).toEqual([10]);
  });

  it('keeps list order in calling and waiting', () => {
    const users = [u(5, 'present'), u(3, 'present'), u(9, 'present'), u(1, 'present')];
    const result = callQueue(users, 2);
    expect(ids(result.calling)).toEqual([5, 3]);
    expect(ids(result.waiting)).toEqual([9, 1]);
  });

  it('does not mutate the input', () => {
    const users = [u(1, 'receiving'), u(2, 'present'), u(3, 'no_show')];
    const snapshot = JSON.parse(JSON.stringify(users));
    Object.freeze(users);
    callQueue(users, 2);
    expect(users).toEqual(snapshot);
  });
});
