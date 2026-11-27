import type { UserWithWindow } from '@/types/window';

export interface CallQueueResult {
  calling: UserWithWindow[];
  waiting: UserWithWindow[];
}

const isStaff = (user: UserWithWindow) =>
  Boolean(user.roles?.includes('volunteer') || user.roles?.includes('admin'));

export function callQueue(users: UserWithWindow[], slots: number): CallQueueResult {
  const eligible = users.filter((user) => !isStaff(user));
  const receiving = eligible.filter((user) => user.status === 'receiving');
  const present = eligible.filter((user) => user.status === 'present' || user.status == null);
  const noShow = eligible.filter((user) => user.status === 'no_show');
  const inside = receiving.slice(0, slots);
  const free = Math.max(0, slots - inside.length);
  const queue = [...present, ...noShow];
  return {
    calling: [...inside, ...queue.slice(0, free)],
    waiting: queue.slice(free),
  };
}
